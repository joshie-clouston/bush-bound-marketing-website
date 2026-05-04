import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { staffNotificationHtml, customerAutoReplyHtml, getTestOverride } from '@/lib/email-templates';
import { createNotionLead, updateNotionLead } from '@/lib/notion';
import { notifyOpsError } from '@/lib/alerts';

export const prerender = false;

const AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);

function validateLocation(body: Record<string, string>): { ok: true } | { ok: false; error: string } {
  const { suburb, state, postcode } = body;
  if (!suburb || !state || !postcode) return { ok: false, error: 'Location is required' };
  if (!/^\d{4}$/.test(postcode)) return { ok: false, error: 'Invalid postcode' };
  if (!AU_STATES.has(state)) return { ok: false, error: 'Invalid state' };
  return { ok: true };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const body = (await request.json()) as Record<string, string>;
    const { step } = body;

    // Step 1: Create lead with contact details
    if (step === '1') {
      const { name, email, phone, vehicle } = body;
      if (!name || !email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let leadId: number | null = null;
      try {
        const result = await runtime.env.DB.prepare(
          `INSERT INTO quotes (name, email, phone, vehicle_model, status, created_at) VALUES (?, ?, ?, ?, 'step1', ?)`
        ).bind(name, email, phone || null, vehicle || null, Date.now()).run();
        leadId = result.meta.last_row_id as number;
      } catch (dbError) {
        console.error('D1 write failed (step 1):', dbError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'D1 insert (step 1)', dbError, { name, email, phone, vehicle });
      }

      // Create Notion page so partial leads (drop-offs) are still visible to Luke
      if (leadId && runtime.env.NOTION_TOKEN && runtime.env.NOTION_DATABASE_ID) {
        try {
          const pageId = await createNotionLead(
            runtime.env.NOTION_TOKEN as string,
            runtime.env.NOTION_DATABASE_ID as string,
            { name, email, phone, vehicle },
          );
          await runtime.env.DB.prepare(
            `UPDATE quotes SET notion_page_id = ? WHERE id = ?`
          ).bind(pageId, leadId).run();
        } catch (notionError) {
          console.error('Notion create failed (step 1):', notionError);
          await notifyOpsError(runtime.env as Record<string, unknown>, 'Notion create (step 1)', notionError, { leadId, name, email });
        }
      }

      return new Response(JSON.stringify({ success: true, leadId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Step 2: Update lead with wishlist, budget, timeline
    if (step === '2') {
      const { leadId, wishlist, budget, timeline } = body;

      if (leadId) {
        try {
          await runtime.env.DB.prepare(
            `UPDATE quotes SET wishlist = ?, budget = ?, timeline = ?, status = 'step2' WHERE id = ?`
          ).bind(wishlist || null, budget || null, timeline || null, parseInt(leadId)).run();
        } catch (dbError) {
          console.error('D1 update failed (step 2):', dbError);
          await notifyOpsError(runtime.env as Record<string, unknown>, 'D1 update (step 2)', dbError, { leadId, wishlist, budget, timeline });
        }

        if (runtime.env.NOTION_TOKEN) {
          try {
            const row = await runtime.env.DB.prepare(
              `SELECT notion_page_id FROM quotes WHERE id = ?`
            ).bind(parseInt(leadId)).first<{ notion_page_id: string | null }>();
            if (row?.notion_page_id) {
              await updateNotionLead(
                runtime.env.NOTION_TOKEN as string,
                row.notion_page_id,
                { wishlist, budget, timeline },
              );
            }
          } catch (notionError) {
            console.error('Notion update failed (step 2):', notionError);
            await notifyOpsError(runtime.env as Record<string, unknown>, 'Notion update (step 2)', notionError, { leadId });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Step 3: Final details + send notification email
    if (step === '3') {
      const { leadId, message, referral, name, email, phone, vehicle, wishlist, budget, timeline, suburb, state, postcode } = body;

      const locationCheck = validateLocation(body);
      if (!locationCheck.ok) {
        return new Response(JSON.stringify({ error: locationCheck.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Capture UTM params
      const { utm_source, utm_medium, utm_campaign } = body;

      // Persist to D1: update if step 1 created a row, otherwise insert a fresh complete row
      // (so a step 1 silent failure never costs us the lead)
      let effectiveLeadId: number | null = leadId ? parseInt(leadId) : null;
      if (effectiveLeadId) {
        try {
          await runtime.env.DB.prepare(
            `UPDATE quotes SET message = ?, referral = ?, suburb = ?, state = ?, postcode = ?, utm_source = ?, utm_medium = ?, utm_campaign = ?, status = 'complete' WHERE id = ?`
          ).bind(message || null, referral || null, suburb, state, postcode, utm_source || null, utm_medium || null, utm_campaign || null, effectiveLeadId).run();
        } catch (dbError) {
          console.error('D1 update failed (step 3):', dbError);
          await notifyOpsError(runtime.env as Record<string, unknown>, 'D1 update (step 3)', dbError, { leadId, name, email });
        }
      } else {
        try {
          const result = await runtime.env.DB.prepare(
            `INSERT INTO quotes (name, email, phone, vehicle_model, wishlist, budget, timeline, message, referral, suburb, state, postcode, utm_source, utm_medium, utm_campaign, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?)`
          ).bind(
            name || 'Unknown', email || 'unknown@unknown', phone || null, vehicle || null,
            wishlist || null, budget || null, timeline || null, message || null, referral || null,
            suburb, state, postcode, utm_source || null, utm_medium || null, utm_campaign || null,
            Date.now(),
          ).run();
          effectiveLeadId = result.meta.last_row_id as number;
          await notifyOpsError(runtime.env as Record<string, unknown>, 'Step 1 was skipped — recovered lead at step 3', new Error('No leadId from step 1; inserted complete row directly'), { effectiveLeadId, name, email });
        } catch (dbError) {
          console.error('D1 insert failed (step 3 fallback):', dbError);
          await notifyOpsError(runtime.env as Record<string, unknown>, 'D1 insert (step 3 fallback)', dbError, { name, email, phone, vehicle });
        }
      }

      // Send notification email to Luke
      try {
        if (runtime.env.RESEND_API_KEY) {
          const resend = new Resend(runtime.env.RESEND_API_KEY as string);

          const fromEmail = `Bush Bound Support <${runtime.env.RESEND_FROM_EMAIL || 'support@send.bushbound.au'}>`;
          const testOverride = getTestOverride(runtime.env as Record<string, unknown>);

          // Staff notification
          await resend.emails.send({
            from: fromEmail,
            to: testOverride || runtime.env.NOTIFICATION_EMAIL || 'luke@bushbound.au',
            replyTo: email,
            subject: `New quote request from ${name} - ${vehicle || 'Vehicle TBD'}`,
            html: staffNotificationHtml([
              ['Name', name],
              ['Phone', phone || 'Not provided'],
              ['Email', email],
              ['Location', `${suburb}, ${state} ${postcode}`],
              ['Vehicle', vehicle || 'Not provided'],
              ['Budget', budget || 'Not specified'],
              ['Timeline', timeline || 'Not specified'],
              ['Wishlist', wishlist || 'Not specified'],
              ['Notes', message || 'None'],
              ['Heard about us via', referral || 'Not specified'],
              ['UTM', [utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct'],
            ]),
          });

          // Customer confirmation
          await resend.emails.send({
            from: fromEmail,
            to: testOverride || email,
            subject: `Thanks for your quote request, ${name.split(' ')[0]}!`,
            html: customerAutoReplyHtml(name, vehicle || 'vehicle'),
          });
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Resend email send (step 3)', emailError, { leadId: effectiveLeadId, name, email });
      }

      // Update existing Notion page with final-step details (non-blocking)
      if (effectiveLeadId && runtime.env.NOTION_TOKEN) {
        try {
          const row = await runtime.env.DB.prepare(
            `SELECT notion_page_id FROM quotes WHERE id = ?`
          ).bind(effectiveLeadId).first<{ notion_page_id: string | null }>();
          if (row?.notion_page_id) {
            await updateNotionLead(
              runtime.env.NOTION_TOKEN as string,
              row.notion_page_id,
              {
                suburb, state, postcode, message, referral,
                utmSource: utm_source, utmMedium: utm_medium, utmCampaign: utm_campaign,
              },
            );
          } else if (runtime.env.NOTION_DATABASE_ID) {
            // Fallback: no page id (step 1 Notion failed) — create now with everything
            const pageId = await createNotionLead(
              runtime.env.NOTION_TOKEN as string,
              runtime.env.NOTION_DATABASE_ID as string,
              {
                name, email, phone, vehicle, wishlist, budget, timeline,
                suburb, state, postcode, message, referral,
                utmSource: utm_source, utmMedium: utm_medium, utmCampaign: utm_campaign,
              },
            );
            try {
              await runtime.env.DB.prepare(
                `UPDATE quotes SET notion_page_id = ? WHERE id = ?`
              ).bind(pageId, effectiveLeadId).run();
            } catch (linkError) {
              console.error('D1 notion_page_id link failed (step 3 fallback):', linkError);
            }
          }
        } catch (notionError) {
          console.error('Notion update failed (step 3):', notionError);
          await notifyOpsError(runtime.env as Record<string, unknown>, 'Notion update (step 3)', notionError, { leadId: effectiveLeadId, name, email });
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Legacy fallback (old form format without step)
    const { name, email, phone, vehicleType, vehicleModel, wishlist, message, referral, utm_source, utm_medium, utm_campaign, utm_term, utm_content, suburb: legacySuburb, state: legacyState, postcode: legacyPostcode } = body;
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      await runtime.env.DB.prepare(
        `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, wishlist, message, referral, status, suburb, state, postcode, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(name, email, phone || null, vehicleType || null, vehicleModel || null, wishlist || null, message || null, referral || null, legacySuburb || null, legacyState || null, legacyPostcode || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
    } catch (dbError) {
      console.error('D1 write failed:', dbError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'D1 insert (legacy)', dbError, { name, email });
    }

    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `Bush Bound Support <${runtime.env.RESEND_FROM_EMAIL || 'support@send.bushbound.au'}>`,
          to: runtime.env.NOTIFICATION_EMAIL || 'luke@bushbound.au',
          subject: `New quote request from ${name} - ${vehicleModel || 'Vehicle TBD'}`,
          html: `<h2>New Quote Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Phone:</strong> ${phone || 'Not provided'}</p><p><strong>Email:</strong> ${email}</p><p><strong>Vehicle:</strong> ${vehicleModel || 'Not provided'}</p><hr /><p><strong>Wishlist:</strong> ${wishlist || 'Not specified'}</p><p><strong>Notes:</strong> ${message || 'None'}</p>`,
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Resend email send (legacy)', emailError, { name, email });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Quote submission failed:', error);
    await notifyOpsError(runtime.env as Record<string, unknown>, 'Quote submission (top-level)', error);
    return new Response(JSON.stringify({ error: 'Failed to submit quote request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
