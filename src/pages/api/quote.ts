import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const { name, email, phone, vehicleType, vehicleModel, serviceType, message, referral, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = (await request.json()) as Record<string, string>;

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store in D1
    await runtime.env.DB.prepare(
      `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, service_type, message, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, email, phone || null, vehicleType, vehicleModel || null, serviceType, message || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();

    // Send notification email (non-blocking)
    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY);

        await resend.emails.send({
          from: `Bush Bound Support <${runtime.env.RESEND_FROM_EMAIL || 'support@bushbound.au'}>`,
          to: runtime.env.NOTIFICATION_EMAIL || 'team@bushbound.au',
          subject: `New quote request from ${name} - ${vehicleModel || 'Vehicle TBD'}`,
          html: `
            <h2>New Quote Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Vehicle:</strong> ${vehicleModel || 'Not provided'}</p>
            <hr />
            <p><strong>What they want:</strong> ${serviceType || 'Not specified'}</p>
            <p><strong>Notes:</strong> ${message || 'None'}</p>
            <hr />
            <p><strong>Heard about us via:</strong> ${referral || 'Not specified'}</p>
            <p><strong>UTM:</strong> ${[utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct'}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Quote submission failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit quote request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
