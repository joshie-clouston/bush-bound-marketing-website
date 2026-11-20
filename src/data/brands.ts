/**
 * Brands we fit and trust, shown in the "Trusted brands" banner on the home page.
 *
 * Only list brands we genuinely use. Each one here is backed by the site's own content
 * (electrical photos, warranty FAQ, customer reviews). Add a `logo` (an SVG or PNG in
 * /public/images/brands/) to show the brand's logo instead of its name; use a version
 * that reads on a dark background.
 */
export interface Brand {
  name: string;
  /** What we use from them, for the tooltip/screen readers */
  what: string;
  logo?: string;
}

export const trustedBrands: Brand[] = [
  { name: 'Victron Energy', what: 'Lithium power, solar and DC-DC charging' },
  { name: 'Bushman', what: 'Upright fridges' },
  { name: 'ARB', what: 'Air compressors' },
  { name: 'Zempire', what: 'Camp tables' },
];
