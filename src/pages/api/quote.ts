import type { APIRoute } from 'astro';

export const prerender = false;

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
      }

      return new Response(JSON.stringify({ success: true, leadId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Step 2: Update lead with wishlist, budget, timeline
    if (step === '2') {
      const { leadId, serviceType, budget, timeline } = body;

      if (leadId) {
        try {
          await runtime.env.DB.prepare(
            `UPDATE quotes SET service_type = ?, budget = ?, timeline = ?, status = 'step2' WHERE id = ?`
          ).bind(serviceType || null, budget || null, timeline || null, parseInt(leadId)).run();
        } catch (dbError) {
          console.error('D1 update failed (step 2):', dbError);
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Step 3: Final details + send notification email
    if (step === '3') {
      const { leadId, message, referral, name, email, phone, vehicle, serviceType, budget, timeline } = body;

      // Update DB
      if (leadId) {
        try {
          await runtime.env.DB.prepare(
            `UPDATE quotes SET message = ?, referral = ?, status = 'complete' WHERE id = ?`
          ).bind(message || null, referral || null, parseInt(leadId)).run();
        } catch (dbError) {
          console.error('D1 update failed (step 3):', dbError);
        }
      }

      // Capture UTM params
      const { utm_source, utm_medium, utm_campaign } = body;

      // Send notification email to Luke
      try {
        if (runtime.env.RESEND_API_KEY) {
          const { Resend } = await import('resend');
          const resend = new Resend(runtime.env.RESEND_API_KEY);

          await resend.emails.send({
            from: `Bush Bound Support <${runtime.env.RESEND_FROM_EMAIL || 'support@send.bushbound.au'}>`,
            to: runtime.env.NOTIFICATION_EMAIL || 'luke@bushbound.au',
            subject: `New quote request from ${name} - ${vehicle || 'Vehicle TBD'}`,
            html: `
              <h2>New Quote Request</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Vehicle:</strong> ${vehicle || 'Not provided'}</p>
              <hr />
              <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
              <p><strong>Timeline:</strong> ${timeline || 'Not specified'}</p>
              <p><strong>What they want:</strong> ${serviceType || 'Not specified'}</p>
              <hr />
              <p><strong>Notes:</strong> ${message || 'None'}</p>
              <p><strong>Heard about us via:</strong> ${referral || 'Not specified'}</p>
              <p><strong>UTM:</strong> ${[utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct'}</p>
            `,
          });
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Legacy fallback (old form format without step)
    const { name, email, phone, vehicleType, vehicleModel, serviceType, message, referral, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body;
    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      await runtime.env.DB.prepare(
        `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, service_type, message, referral, status, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?)`
      ).bind(name, email, phone || null, vehicleType || null, vehicleModel || null, serviceType || null, message || null, referral || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
    } catch (dbError) {
      console.error('D1 write failed:', dbError);
    }

    try {
      if (runtime.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(runtime.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `Bush Bound Support <${runtime.env.RESEND_FROM_EMAIL || 'support@send.bushbound.au'}>`,
          to: runtime.env.NOTIFICATION_EMAIL || 'luke@bushbound.au',
          subject: `New quote request from ${name} - ${vehicleModel || 'Vehicle TBD'}`,
          html: `<h2>New Quote Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Phone:</strong> ${phone || 'Not provided'}</p><p><strong>Email:</strong> ${email}</p><p><strong>Vehicle:</strong> ${vehicleModel || 'Not provided'}</p><hr /><p><strong>What they want:</strong> ${serviceType || 'Not specified'}</p><p><strong>Notes:</strong> ${message || 'None'}</p>`,
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Quote submission failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit quote request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
