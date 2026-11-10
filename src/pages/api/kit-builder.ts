import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { staffNotificationHtml, kitCustomerHtml, emailRecipient } from '@/lib/email-templates';
import { createNotionLead, updateNotionLead } from '@/lib/notion';
import { notifyOpsError } from '@/lib/alerts';
import { recommend, sanitiseAnswers, summaryText } from '@/lib/kit-builder/engine';
import { priceBracket, priceKit } from '@/lib/kit-builder/pricing.server';

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
    const quote = priceKit(answers);
    const bracket = priceBracket(answers);
    const summary = `${summaryText(answers, rec)}\nBracket shown to customer: ${bracket}`;
    const vehicleLabel = answers.vehicle === 'other' ? answers.vehicleName || 'Other vehicle' : rec.vehicle.label;

    // The intro screen already saved this person as a lead (/api/kit-lead). Update that row and its
    // Notion page if the email still matches; otherwise create a fresh one.
    const startedId = Number(body.leadId);
    let leadId: number | null = null;
    let existingPageId: string | null = null;
    if (Number.isInteger(startedId) && startedId > 0) {
      try {
        const result = await runtime.env.DB.prepare(
          `UPDATE quotes SET name = ?, phone = ?, vehicle_model = ?, wishlist = ?, message = ?, postcode = ?, status = 'kit-request'
           WHERE id = ? AND email = ?`
        ).bind(name, phone || null, vehicleLabel, summary, notes || null, postcode || null, startedId, email).run();
        if (result.meta.changes > 0) {
          leadId = startedId;
          const row = await runtime.env.DB.prepare(`SELECT notion_page_id FROM quotes WHERE id = ?`).bind(leadId).first<{ notion_page_id: string | null }>();
          existingPageId = row?.notion_page_id ?? null;
        }
      } catch (dbError) {
        console.error('D1 update failed (kit builder):', dbError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder D1 update', dbError, { startedId, email });
      }
    }

    // Store in D1 (non-blocking)
    if (!leadId) {
      try {
        const result = await runtime.env.DB.prepare(
          `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, wishlist, message, postcode, utm_source, utm_medium, utm_campaign, status, created_at)
           VALUES (?, ?, ?, 'flatpack-kit', ?, ?, ?, ?, ?, ?, ?, 'kit-request', ?)`
        ).bind(
          name, email, phone || null, vehicleLabel, summary, notes || null, postcode || null,
          utm_source || null, utm_medium || null, utm_campaign || null, Date.now(),
        ).run();
        leadId = result.meta.last_row_id as number;
      } catch (dbError) {
        console.error('D1 write failed (kit builder):', dbError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder D1 insert', dbError, { name, email });
      }
    }

    // Notion CRM lead (non-blocking)
    if (runtime.env.NOTION_TOKEN) {
      const lead = {
        name,
        email,
        phone,
        vehicle: vehicleLabel,
        type: 'Flatpack Kit' as const,
        wishlist: summary,
        postcode,
        message: notes || 'Requested an official quote from the kit builder.',
        referral: 'Kit builder',
        utmSource: utm_source,
        utmMedium: utm_medium,
        utmCampaign: utm_campaign,
      };
      try {
        if (existingPageId) {
          await updateNotionLead(runtime.env.NOTION_TOKEN as string, existingPageId, lead);
        } else if (runtime.env.NOTION_DATABASE_ID) {
          const pageId = await createNotionLead(runtime.env.NOTION_TOKEN as string, runtime.env.NOTION_DATABASE_ID as string, lead);
          if (leadId) await runtime.env.DB.prepare(`UPDATE quotes SET notion_page_id = ? WHERE id = ?`).bind(pageId, leadId).run();
        }
      } catch (notionError) {
        console.error('Notion write failed (kit builder):', notionError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit builder Notion write', notionError, { leadId, name, email });
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
          subject: `New kit request: ${rec.kitName} for ${vehicleLabel} (${name})`,
          html: staffNotificationHtml(
            [
              ['Name', escapeHtml(name)],
              ['Phone', escapeHtml(phone || 'Not provided')],
              ['Email', escapeHtml(email)],
              ['Postcode', escapeHtml(postcode || 'Not provided')],
              ['Kit', escapeHtml(`${rec.kitName} for ${vehicleLabel}: ${rec.addOns.join(', ')}`)],
              ['Answers', pre(summary)],
              ['Internal pricing', quote.lines.map((l) => `${escapeHtml(l.label)}: ${money(l.amount)}`).join('<br />')],
              ['Internal total', money(quote.total)],
              ['Bracket shown', escapeHtml(bracket)],
              ['Notes', escapeHtml(notes || 'None')],
              ['UTM', escapeHtml([utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct')],
            ],
            'New Flat Pack Kit Request',
          ),
        });

        const items = rec.items.map((i) => escapeHtml(i.label));

        await resend.emails.send({
          from,
          to: emailRecipient(email, email),
          subject: `We've got your kit request, ${name.split(' ')[0]}`,
          html: kitCustomerHtml(escapeHtml(name), rec.kitName, escapeHtml(vehicleLabel), items, bracket),
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
