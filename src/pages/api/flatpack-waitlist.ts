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
