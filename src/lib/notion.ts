const NOTION_API = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';

const BUDGET_LABELS: Record<string, string> = {
  'under-5k': 'Under $5K',
  '5k-25k': '$5K - $25K',
  '25k-50k': '$25K - $50K',
  '50k-plus': '$50K+',
};

const TIMELINE_LABELS: Record<string, string> = {
  'planning': 'Just planning',
  '6-months': 'Within 6 months',
  '3-months': 'Within 3 months',
  'asap': 'ASAP',
};

export type LeadPayload = {
  name: string;
  email: string;
  phone?: string | null;
  vehicle?: string | null;
  wishlist?: string | null;
  budget?: string | null;
  timeline?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  message?: string | null;
  referral?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

const richText = (value?: string | null) =>
  value ? { rich_text: [{ text: { content: value.slice(0, 2000) } }] } : { rich_text: [] };

export async function createNotionLead(
  token: string,
  databaseId: string,
  lead: LeadPayload,
): Promise<void> {
  const location = [lead.suburb, lead.state, lead.postcode].filter(Boolean).join(' ');
  const source = [lead.referral, lead.utmSource, lead.utmMedium, lead.utmCampaign]
    .filter(Boolean)
    .join(' / ');

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: lead.name } }] },
    'Email ': { email: lead.email },
    Status: { status: { name: 'Lead' } },
    Enquired: { date: { start: new Date().toISOString().slice(0, 10) } },
    ...(lead.phone ? { Mobile: { phone_number: lead.phone } } : {}),
    ...(lead.vehicle ? { Model: richText(lead.vehicle) } : {}),
    ...(lead.wishlist ? { Wishlist: richText(lead.wishlist) } : {}),
    ...(location ? { Location: richText(location) } : {}),
    ...(lead.message ? { Notes: richText(lead.message) } : {}),
    ...(source ? { Source: richText(source) } : {}),
    ...(lead.budget && BUDGET_LABELS[lead.budget]
      ? { Budget: { select: { name: BUDGET_LABELS[lead.budget] } } }
      : {}),
    ...(lead.timeline && TIMELINE_LABELS[lead.timeline]
      ? { Timeline: { select: { name: TIMELINE_LABELS[lead.timeline] } } }
      : {}),
  };

  const res = await fetch(NOTION_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Notion API ${res.status}: ${errorText}`);
  }
}
