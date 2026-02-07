import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;

  try {
    const { name, email, phone, vehicleType, vehicleModel, serviceType, message } = await request.json();

    if (!name || !email || !vehicleType || !serviceType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store in D1
    await runtime.env.DB.prepare(
      `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, service_type, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, email, phone || null, vehicleType, vehicleModel || null, serviceType, message || null, Date.now()).run();

    // Send notification email (non-blocking)
    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY);

        await resend.emails.send({
          from: runtime.env.RESEND_FROM_EMAIL || 'hello@bushbound.au',
          to: runtime.env.NOTIFICATION_EMAIL || 'team@bushbound.au',
          subject: `New quote request from ${name}`,
          html: `
            <h2>New Quote Request</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Vehicle Type:</strong> ${vehicleType}</p>
            <p><strong>Vehicle Model:</strong> ${vehicleModel || 'Not provided'}</p>
            <p><strong>Service:</strong> ${serviceType}</p>
            <p><strong>Message:</strong> ${message || 'No message'}</p>
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
