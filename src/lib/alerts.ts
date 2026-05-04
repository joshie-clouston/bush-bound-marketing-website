import { Resend } from 'resend';

type AlertEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ALERT_EMAIL?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}\n${error.stack || ''}`;
  try { return JSON.stringify(error, null, 2); } catch { return String(error); }
}

export async function notifyOpsError(
  env: Record<string, unknown>,
  context: string,
  error: unknown,
  payload?: Record<string, unknown>,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY as string | undefined;
  if (!apiKey) return;

  const to = (env.ALERT_EMAIL as string | undefined) || 'josh@founddigital.ai';
  const from = `Bush Bound Alerts <${(env.RESEND_FROM_EMAIL as string | undefined) || 'support@send.bushbound.au'}>`;

  const errorText = formatError(error);
  const payloadText = payload ? JSON.stringify(payload, null, 2) : '(none)';

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `[Bush Bound] ${context} failed`,
      html: `
        <h2>${escapeHtml(context)} failed</h2>
        <p>Time: ${new Date().toISOString()}</p>
        <h3>Error</h3>
        <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(errorText)}</pre>
        <h3>Context</h3>
        <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(payloadText)}</pre>
      `,
    });
  } catch (alertError) {
    console.error('Alert email failed:', alertError);
  }
}
