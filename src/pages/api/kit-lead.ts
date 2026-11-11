import type { APIRoute } from 'astro';
import { createNotionLead } from '@/lib/notion';
import { notifyOpsError } from '@/lib/alerts';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (value: unknown, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Kit builder lead capture: email + mobile from the intro screen, saved before they start building
// so we still have the lead if they drop off. The final quote request (/api/kit-builder) updates
// this same row and Notion page instead of creating new ones.
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const name = clean(body.name, 120) || email;
    const vehicle = clean(body.vehicle, 120);
    const picks = clean(body.picks, 500);
    const utm_source = clean(body.utm_source);
    const utm_medium = clean(body.utm_medium);
    const utm_campaign = clean(body.utm_campaign);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
    if (phone.replace(/\D/g, '').length < 8) return json({ error: 'A valid mobile is required' }, 400);

    let leadId: number | null = null;
    try {
      const result = await runtime.env.DB.prepare(
        `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, wishlist, utm_source, utm_medium, utm_campaign, status, created_at)
         VALUES (?, ?, ?, 'flatpack-kit', ?, ?, ?, ?, ?, 'kit-started', ?)`
      ).bind(name, email, phone, vehicle || null, picks || null, utm_source || null, utm_medium || null, utm_campaign || null, Date.now()).run();
      leadId = result.meta.last_row_id as number;
    } catch (dbError) {
      console.error('D1 write failed (kit lead):', dbError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit lead D1 insert', dbError, { email, phone });
    }

    if (runtime.env.NOTION_TOKEN && runtime.env.NOTION_DATABASE_ID) {
      try {
        const pageId = await createNotionLead(runtime.env.NOTION_TOKEN as string, runtime.env.NOTION_DATABASE_ID as string, {
          name,
          email,
          phone,
          vehicle,
          wishlist: picks,
          type: 'Flatpack Kit',
          message: 'Started the kit builder (no quote request yet).',
          referral: 'Kit builder',
          utmSource: utm_source,
          utmMedium: utm_medium,
          utmCampaign: utm_campaign,
        });
        if (leadId) await runtime.env.DB.prepare(`UPDATE quotes SET notion_page_id = ? WHERE id = ?`).bind(pageId, leadId).run();
      } catch (notionError) {
        console.error('Notion create failed (kit lead):', notionError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit lead Notion create', notionError, { leadId, email });
      }
    }

    return json({ success: true, leadId });
  } catch (error) {
    console.error('Kit lead failed:', error);
    await notifyOpsError(runtime.env as Record<string, unknown>, 'Kit lead (top-level)', error);
    return json({ error: 'Failed' }, 500);
  }
};
