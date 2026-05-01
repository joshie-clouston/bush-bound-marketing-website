const NOTION_API = 'https://api.notion.com/v1';
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
  name?: string | null;
  email?: string | null;
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

const richText = (value: string) => ({
  rich_text: [{ text: { content: value.slice(0, 2000) } }],
});

function buildProperties(lead: LeadPayload): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if (lead.name) props.Name = { title: [{ text: { content: lead.name } }] };
  if (lead.email) props['Email '] = { email: lead.email };
  if (lead.phone) props.Mobile = { phone_number: lead.phone };
  if (lead.vehicle) props.Model = richText(lead.vehicle);
  if (lead.wishlist) props.Wishlist = richText(lead.wishlist);
  if (lead.message) props.Notes = richText(lead.message);

  if (lead.budget && BUDGET_LABELS[lead.budget]) {
    props.Budget = { select: { name: BUDGET_LABELS[lead.budget] } };
  }
  if (lead.timeline && TIMELINE_LABELS[lead.timeline]) {
    props.Timeline = { select: { name: TIMELINE_LABELS[lead.timeline] } };
  }

  const location = [lead.suburb, lead.state, lead.postcode].filter(Boolean).join(' ');
  if (location) props.Location = richText(location);

  const source = [lead.referral, lead.utmSource, lead.utmMedium, lead.utmCampaign]
    .filter(Boolean)
    .join(' / ');
  if (source) props.Source = richText(source);

  return props;
}

export async function createNotionLead(
  token: string,
  databaseId: string,
  lead: LeadPayload,
): Promise<string> {
  const properties = {
    ...buildProperties(lead),
    Status: { status: { name: 'Lead' } },
    Enquired: { date: { start: new Date().toISOString().slice(0, 10) } },
  };

  const res = await fetch(`${NOTION_API}/pages`, {
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
    throw new Error(`Notion create ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function updateNotionLead(
  token: string,
  pageId: string,
  lead: LeadPayload,
): Promise<void> {
  const properties = buildProperties(lead);
  if (Object.keys(properties).length === 0) return;

  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    throw new Error(`Notion update ${res.status}: ${await res.text()}`);
  }
}
