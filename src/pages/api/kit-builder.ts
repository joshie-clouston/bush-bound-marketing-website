import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { staffNotificationHtml, kitCustomerHtml, emailRecipient } from '@/lib/email-templates';
import { createNotionLead } from '@/lib/notion';
import { notifyOpsError } from '@/lib/alerts';
import { recommend, sanitiseAnswers, summaryText, fusionParamsCsv } from '@/lib/kit-builder/engine';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const clean = (value: unknown, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Kit builder submissions. Stored in the existing `quotes` table (vehicle_type = 'flatpack-kit')
// so no D1 migration is needed for the MVP. See docs/superpowers/specs/2026-11-10-flatpack-kit-builder.md
// for the dedicated kit_orders table planned for real checkout.
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const contact = (body.contact ?? {}) as Record<string, unknown>;
    const name = clean(contact.name, 120);
    const email = clean(contact.email, 200).toLowerCase();
    const phone = clean(contact.phone, 40);
    const postcode = clean(contact.postcode, 4);
    const notes = clean(contact.notes, 2000);
    const utm_source = clean(body.utm_source);
    const utm_medium = clean(body.utm_medium);
    const utm_campaign = clean(body.utm_campaign);

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Name and a valid email are required' }, 400);
    if (postcode && !/^\d{4}$/.test(postcode)) return json({ error: 'Invalid postcode' }, 400);

    // Never trust the client's maths: rebuild the recommendation from sanitised answers.
    const answers = sanitiseAnswers(body.answers);
    if (!answers.vehicle) return json({ error: 'Pick a vehicle first' }, 400);
    const rec = recommend(answers);
    const summary = summaryText(answers, rec);
    const csv = fusionParamsCsv(rec);

    // Store in D1 (non-blocking)
    let leadId: number | null = null;
    try {
      const result = await runtime.env.DB.prepare(
        `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, wishlist, message, postcode, utm_source, utm_medium, utm_campaign, status, created_at)
         VALUES (?, ?, ?, 'flatpack-kit', ?, ?, ?, ?, ?, ?, ?, 'kit-request', ?)`
      ).bind(
        name, email, phone || null, rec.vehicle.label, summary, notes || null, postcode || null,
        utm_source || null, utm_medium || null, utm_campaign || null, Date.now(),
      ).run();
      leadId = result.meta.last_row_id as number;
    } catch (dbError) {
      console.error('D1 write failed (kit builder):', dbError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder D1 insert', dbError, { name, email });
    }

    // Notion CRM lead (non-blocking)
    if (runtime.env.NOTION_TOKEN && runtime.env.NOTION_DATABASE_ID) {
      try {
        const pageId = await createNotionLead(runtime.env.NOTION_TOKEN as string, runtime.env.NOTION_DATABASE_ID as string, {
          name,
          email,
          phone,
          vehicle: rec.vehicle.label,
          type: 'Flatpack Kit',
          wishlist: summary,
          postcode,
          message: notes,
          referral: 'Kit builder',
          utmSource: utm_source,
          utmMedium: utm_medium,
          utmCampaign: utm_campaign,
        });
        if (leadId) {
          await runtime.env.DB.prepare(`UPDATE quotes SET notion_page_id = ? WHERE id = ?`).bind(pageId, leadId).run();
        }
      } catch (notionError) {
        console.error('Notion create failed (kit builder):', notionError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder Notion create', notionError, { leadId, name, email });
      }
    }

    // Emails (non-blocking)
    try {
      if (runtime.env.RESEND_API_KEY) {
        const resend = new Resend(runtime.env.RESEND_API_KEY as string);
        const from = `Bush Bound Support <${(runtime.env.RESEND_FROM_EMAIL as string) || 'support@send.bushbound.au'}>`;
        const money = (n: number) => `$${n.toLocaleString('en-AU')}`;
        const pre = (s: string) => `<pre style="white-space: pre-wrap; font-size: 12px; margin: 0;">${escapeHtml(s)}</pre>`;

        await resend.emails.send({
          from,
          to: emailRecipient((runtime.env.NOTIFICATION_EMAIL as string) || 'luke@bushbound.au', email),
          replyTo: email,
          subject: `New kit request: ${rec.kitName} for ${rec.vehicle.short} (${name})`,
          html: staffNotificationHtml(
            [
              ['Name', escapeHtml(name)],
              ['Phone', escapeHtml(phone || 'Not provided')],
              ['Email', escapeHtml(email)],
              ['Postcode', escapeHtml(postcode || 'Not provided')],
              ['Kit', `${rec.kitName} for ${rec.vehicle.label}`],
              ['Answers', pre(summary)],
              ['Kit lines', rec.kitLines.map((l) => `${escapeHtml(l.label)}: ${money(l.amount)}`).join('<br />')],
              ['Electrical', rec.electricalLines.length ? rec.electricalLines.map((l) => `${escapeHtml(l.label)}: ${money(l.amount)}`).join('<br />') : 'None'],
              ['Parts list', rec.power.products.length ? rec.power.products.map(escapeHtml).join('<br />') : 'None'],
              ['Indicative total', money(rec.total)],
              ['Notes', escapeHtml(notes || 'None')],
              ['Fusion params (CSV)', pre(csv)],
              ['UTM', escapeHtml([utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct')],
            ],
            'New Flat Pack Kit Request',
          ),
          attachments: [{ filename: `bushbound-kit-${leadId ?? 'request'}-params.csv`, content: btoa(csv) }],
        });

        const items = [
          `${rec.kitName} for your ${rec.vehicle.label}`,
          ...rec.why.slice(1),
          rec.power.batteryAh ? `${rec.power.tierName}: ${rec.power.batteryAh}Ah battery${rec.power.solarW ? `, ${rec.power.solarW}W solar` : ''}` : '',
        ].filter(Boolean).map(escapeHtml);

        await resend.emails.send({
          from,
          to: emailRecipient(email, email),
          subject: `Your ${rec.kitName} is locked in, ${name.split(' ')[0]}`,
          html: kitCustomerHtml(escapeHtml(name), rec.kitName, rec.vehicle.short, items, money(rec.total)),
        });
      }
    } catch (emailError) {
      console.error('Kit builder email failed:', emailError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder email send', emailError, { leadId, name, email });
    }

    return json({ success: true, leadId });
  } catch (error) {
    console.error('Kit builder failed:', error);
    await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder (top-level)', error);
    return json({ error: 'Failed' }, 500);
  }
};
