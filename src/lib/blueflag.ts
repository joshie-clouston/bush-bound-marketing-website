export interface VehicleDetails {
  vin: string | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  bodyType: string | null;
  vehicleType: string | null;
}

export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

export function normalisePlate(plate: string): string {
  return plate.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

// Blue Flag NEVDIS Vehicle Details: plate + state -> make/model/colour etc.
// Sandbox keys (prefix secret_SANDBOX) must hit the sandbox host. Returns null on no match or any failure.
export async function lookupVehicle(apiKey: string, plate: string, state: string): Promise<VehicleDetails | null> {
  const host = apiKey.startsWith('secret_SANDBOX') ? 'sandbox.blueflag.com.au' : 'api.blueflag.com.au';
  const url = `https://${host}/nevdis/vehicle_details?plate=${encodeURIComponent(normalisePlate(plate))}&state=${encodeURIComponent(state)}`;

  const res = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(5000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blue Flag vehicle_details ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const body = (await res.json()) as { result?: Array<Record<string, any>> };
  const v = body.result?.[0];
  if (!v) return null;

  return {
    vin: v.vin ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    colour: v.colour ?? null,
    bodyType: v.body_type ?? null,
    vehicleType: v.vehicle_type ?? null,
  };
}

// One-line summary for CRM / email, e.g. "Toyota Landcruiser, Green, 4WD wagon | Rego ABC123 (QLD) | VIN ..."
export function formatVehicle(v: VehicleDetails, plate: string, state: string): string {
  const title = [v.make, v.model].filter(Boolean).join(' ');
  const parts = [[title, v.colour, v.bodyType].filter(Boolean).join(', '), `Rego ${normalisePlate(plate)} (${state})`];
  if (v.vin) parts.push(`VIN ${v.vin}`);
  return parts.filter(Boolean).join(' | ');
}

// Standard plate patterns (A = letter, N = number), per Linkt's published table. Custom, older and motorcycle
// plates don't follow these, and several states overlap, so treat a match as a hint, never proof.
const PLATE_PATTERNS: Record<(typeof AU_STATES)[number], RegExp> = {
  SA: /^S\d{3}[A-Z]{3}$/,
  ACT: /^Y[A-Z]{2}\d{2}[A-Z]$/,
  NT: /^C[A-Z]\d{2}[A-Z]{2}$/,
  WA: /^\d[A-Z]{3}\d{3}$/,
  QLD: /^\d{3}[A-Z]{3}$|^\d{3}[A-Z]{2}\d$/,
  VIC: /^[A-Z]{3}\d{3}$|^\d[A-Z]{2}\d[A-Z]{2}$/,
  NSW: /^[A-Z]{2}\d{2}[A-Z]{2}$|^[A-Z]{3}\d{2}[A-Z]$/,
  TAS: /^[A-Z]\d{2}[A-Z]{2}$/,
};

// States to try, most likely first: format-matched states, then the customer's own state. Capped because live lookups are billed.
export function candidateStates(plate: string, preferredState?: string | null): string[] {
  const p = normalisePlate(plate);
  const matched = AU_STATES.filter((st) => PLATE_PATTERNS[st].test(p)) as string[];
  const preferred = preferredState && (AU_STATES as readonly string[]).includes(preferredState) ? [preferredState] : [];
  return [...new Set([...matched, ...preferred])].slice(0, 3);
}

// Tries each candidate state until one matches. Returns the matched state with the vehicle.
export async function lookupVehicleAnyState(
  apiKey: string,
  plate: string,
  preferredState?: string | null,
): Promise<{ vehicle: VehicleDetails; state: string } | null> {
  for (const state of candidateStates(plate, preferredState)) {
    const vehicle = await lookupVehicle(apiKey, plate, state);
    if (vehicle) return { vehicle, state };
  }
  return null;
}
