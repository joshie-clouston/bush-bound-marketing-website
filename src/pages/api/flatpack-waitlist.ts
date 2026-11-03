import type { APIRoute } from 'astro';
import { notifyOpsError } from '@/lib/alerts';
import { createNotionLead } from '@/lib/notion';
import { emailRecipient } from '@/lib/email-templates';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const { email, rego, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = (await request.json()) as Record<string, string>;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const regoPlate = rego ? rego.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : null;

    // Store in D1 (non-blocking)
    let isNewSignup = true;
    try {
      const insert = await runtime.env.DB.prepare(
        `INSERT OR IGNORE INTO flatpack_waitlist (email, rego, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(email, regoPlate, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
      isNewSignup = insert.meta.changes > 0;
    } catch (dbError) {
      console.error('D1 write failed (continuing):', dbError);
      await notifyOpsError(runtime.env as Record<string, unknown>, 'Flatpack waitlist D1 insert', dbError, { email, rego });
    }

    // Create a Notion CRM lead for Luke, badged as a flatpack waitlist enquiry (non-blocking)
    if (isNewSignup && runtime.env.NOTION_TOKEN && runtime.env.NOTION_DATABASE_ID) {
      try {
        await createNotionLead(runtime.env.NOTION_TOKEN as string, runtime.env.NOTION_DATABASE_ID as string, {
          name: email,
          email,
          type: 'Flatpack Waitlist',
          vehicle: regoPlate ? `Rego ${regoPlate}` : null,
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
            <p><strong>Rego:</strong> ${regoPlate || 'Not provided'}</p>
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
