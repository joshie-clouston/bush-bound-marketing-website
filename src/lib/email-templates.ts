// Bush Bound branded email templates
// Brand: Forest green (#2D4A3E), sand (#C4A882), charcoal (#1A1A1A), stone (#E8E0D6)

const LOGO_URL = 'https://bushbound.au/images/email-logo.png';

const BRAND = {
  primary: '#2D4A3E',
  sand: '#C4A882',
  charcoal: '#1A1A1A',
  stone: '#E8E0D6',
  white: '#ffffff',
  text: '#333333',
  muted: '#666666',
};

function wrapper(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.stone}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.stone};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND.charcoal}; padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="${LOGO_URL}" width="36" height="36" alt="Bush Bound" style="display: inline-block; vertical-align: middle; margin-right: 12px; border-radius: 6px;" />
                    <span style="color: ${BRAND.stone}; font-size: 20px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; vertical-align: middle;">BUSH BOUND</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Sand accent bar -->
          <tr>
            <td style="background-color: ${BRAND.sand}; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: ${BRAND.white}; padding: 32px;">
              ${body}
            </td>
          </tr>
          <!-- Sand accent bar -->
          <tr>
            <td style="background-color: ${BRAND.sand}; height: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.charcoal}; padding: 20px 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: ${BRAND.muted}; font-size: 12px;">
                    Bush Bound &middot; Gold Coast, QLD &middot; <a href="https://bushbound.au" style="color: ${BRAND.sand}; text-decoration: none;">bushbound.au</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function staffNotificationHtml(fields: [string, string][]): string {
  const rows = fields
    .map(([label, value]) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: ${BRAND.muted}; font-size: 13px; font-weight: 600; width: 140px; vertical-align: top;">${label}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: ${BRAND.text}; font-size: 14px;">${value}</td>
      </tr>`)
    .join('');

  const body = `
    <h1 style="margin: 0 0 24px 0; font-size: 20px; color: ${BRAND.charcoal};">New Quote Request</h1>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
  `;

  return wrapper('New Quote Request', body);
}

export function customerAutoReplyHtml(fullName: string, vehicle: string): string {
  const name = fullName.split(' ')[0];
  const body = `
    <h1 style="margin: 0 0 8px 0; font-size: 20px; color: ${BRAND.charcoal};">We've got your quote request</h1>
    <p style="color: ${BRAND.text}; font-size: 15px; line-height: 1.6; margin: 16px 0;">Hey ${name},</p>
    <p style="color: ${BRAND.text}; font-size: 15px; line-height: 1.6; margin: 16px 0;">Thanks for getting in touch about your ${vehicle || 'vehicle'} fit-out. We'll give you a call within 48 hours to talk through the design and give you a rough quote.</p>
    <p style="color: ${BRAND.text}; font-size: 15px; line-height: 1.6; margin: 16px 0;">In the meantime, check out some of our recent builds:</p>
    <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${BRAND.primary}; border-radius: 6px;">
          <a href="https://bushbound.au/reviews" style="display: inline-block; padding: 12px 24px; color: ${BRAND.stone}; font-size: 14px; font-weight: 600; text-decoration: none;">See Recent Builds</a>
        </td>
      </tr>
    </table>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: ${BRAND.muted}; font-size: 13px; line-height: 1.5;">If you need to reach us before then, call <a href="tel:+61424770875" style="color: ${BRAND.text}; font-weight: bold; text-decoration: none;">0424 770 875</a> or reply to this email.</p>
    <p style="color: ${BRAND.text}; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">Cheers,<br /><strong>The Bush Bound Team</strong></p>
  `;

  return wrapper(`Thanks for your quote request, ${name}!`, body);
}

export function getTestOverride(env: Record<string, unknown>): string | undefined {
  return (env.TEST_EMAIL_OVERRIDE as string) || undefined;
}
