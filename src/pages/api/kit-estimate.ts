import type { APIRoute } from 'astro';
import { sanitiseAnswers } from '@/lib/kit-builder/engine';
import { priceBracket } from '@/lib/kit-builder/pricing.server';

export const prerender = false;

// Returns only a price bracket for the kit builder. Exact prices never leave the server.
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { answers?: unknown };
    const bracket = priceBracket(sanitiseAnswers(body.answers));
    return new Response(JSON.stringify({ bracket }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
};
