import type { APIRoute } from 'astro';

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

    // Store in D1
    await runtime.env.DB.prepare(
      `INSERT OR IGNORE INTO flatpack_waitlist (email, rego, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(email, rego || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();

    // Send notification email (non-blocking)
    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY as string);

        const utmInfo = [utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ');
        await resend.emails.send({
          from: `Bushbound Support <${(runtime.env.RESEND_FROM_EMAIL as string) || 'support@bushbound.au'}>`,
          to: (runtime.env.NOTIFICATION_EMAIL as string) || 'team@bushbound.au',
          subject: `New flat pack waitlist signup: ${email}`,
          html: `
            <h2>New Flat Pack Waitlist Signup</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Rego:</strong> ${rego || 'Not provided'}</p>
            <hr />
            <p><strong>Source:</strong> ${utmInfo || 'Direct'}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error('Flatpack waitlist email failed:', emailError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Flatpack waitlist failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
