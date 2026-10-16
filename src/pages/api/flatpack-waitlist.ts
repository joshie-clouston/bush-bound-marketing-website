import type { APIRoute } from 'astro';
import { notifyOpsError } from '@/lib/alerts';
import { lookupVehicleAnyState, formatVehicle, AU_STATES, normalisePlate, type VehicleDetails } from '@/lib/blueflag';
import { createNotionLead } from '@/lib/notion';
import { emailRecipient } from '@/lib/email-templates';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const { email, rego, rego_state, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = (await request.json()) as Record<string, string>;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const regoState = (AU_STATES as readonly string[]).includes(rego_state) ? rego_state : null;

    // Store in D1 (non-blocking)
    let isNewSignup = true;
    try {
      const insert = await runtime.env.DB.prepare(
        `INSERT OR IGNORE INTO flatpack_waitlist (email, rego, rego_state, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(email, rego ? normalisePlate(rego) : null, regoState, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
      isNewSignup = insert.meta.changes > 0;
    } catch (dbError) {
      console.error('D1 write failed (continuing):', dbError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist D1 insert', dbError, { email, rego });
    }

    // Enrich with vehicle details from Blue Flag (non-blocking)
    let vehicle: VehicleDetails | null = null;
    let foundState = regoState;
    if (isNewSignup && rego && runtime.env.BLUEFLAG_API_KEY) {
      try {
        const found = await lookupVehicleAnyState(runtime.env.BLUEFLAG_API_KEY as string, rego, regoState);
        if (found) {
          vehicle = found.vehicle;
          foundState = found.state;
          await runtime.env.DB.prepare(
            `UPDATE flatpack_waitlist SET rego_state = ?, vin = ?, make = ?, model = ?, colour = ?, body_type = ?, vehicle_type = ?, enriched_at = ? WHERE email = ?`
          ).bind(foundState, vehicle.vin, vehicle.make, vehicle.model, vehicle.colour, vehicle.bodyType, vehicle.vehicleType, Math.floor(Date.now() / 1000), email).run();
        }
      } catch (enrichError) {
        console.error('Vehicle enrichment failed (continuing):', enrichError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist vehicle enrichment', enrichError, { email, rego, regoState });
      }
    }

    // Create a Notion CRM lead for Luke, badged as a flatpack waitlist enquiry (non-blocking)
    if (isNewSignup && runtime.env.NOTION_TOKEN && runtime.env.NOTION_DATABASE_ID) {
      try {
        await createNotionLead(runtime.env.NOTION_TOKEN as string, runtime.env.NOTION_DATABASE_ID as string, {
          name: email,
          email,
          type: 'Flatpack Waitlist',
          vehicle: vehicle && rego && foundState ? formatVehicle(vehicle, rego, foundState) : rego ? `Rego ${normalisePlate(rego)} (no vehicle match)` : null,
          referral: 'Flat pack waitlist',
          utmSource: utm_source,
          utmMedium: utm_medium,
          utmCampaign: utm_campaign,
        });
      } catch (notionError) {
        console.error('Notion create failed (waitlist):', notionError);
        await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist Notion create', notionError, { email, rego });
      }
    }

    // Send notification email (non-blocking)
    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY as string);

        const utmInfo = [utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ');
        await resend.emails.send({
          from: `Bush Bound Support <${(runtime.env.RESEND_FROM_EMAIL as string) || 'support@send.bushbound.au'}>`,
          to: emailRecipient((runtime.env.NOTIFICATION_EMAIL as string) || 'luke@bushbound.au', email),
          subject: `New flat pack waitlist signup: ${email}`,
          html: `
            <h2>New Flat Pack Waitlist Signup</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Rego:</strong> ${rego ? `${normalisePlate(rego)}${foundState ? ` (${foundState})` : ''}` : 'Not provided'}</p>
            ${vehicle ? `<p><strong>Vehicle:</strong> ${[vehicle.make, vehicle.model, vehicle.colour].filter(Boolean).join(' ')}<br /><strong>Body:</strong> ${vehicle.bodyType || 'n/a'}<br /><strong>Type:</strong> ${vehicle.vehicleType || 'n/a'}<br /><strong>VIN:</strong> ${vehicle.vin || 'n/a'}</p>` : rego ? '<p><em>Vehicle lookup found no match.</em></p>' : ''}
            <hr />
            <p><strong>Source:</strong> ${utmInfo || 'Direct'}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error('Flatpack waitlist email failed:', emailError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist email send', emailError, { email });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Flatpack waitlist failed:', error);
    await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist (top-level)', error);
    return new Response(
      JSON.stringify({ error: 'Failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
