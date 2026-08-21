const GENERIC_PLACE_WORDS = new Set([
  'the', 'and', 'for', 'hub', 'depot', 'camp', 'relief', 'shelter', 'warehouse',
  'center', 'centre', 'supply', 'central', 'from', 'to',
  'divisional', 'logistics', 'site', 'office', 'unit'
]);

export const normalizePlaceName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Match logistics hubs / shelters even when one name has extra tags
 * like [Hub], (Sylhet), or a [BRAC]/[GOV] prefix.
 */
export const facilityMatch = (a, b) => {
  const s1 = normalizePlaceName(a);
  const s2 = normalizePlaceName(b);
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const uniqueTokens = (s) =>
    s.split(' ').filter((w) => w.length > 2 && !GENERIC_PLACE_WORDS.has(w));
  const u1 = uniqueTokens(s1);
  const u2 = uniqueTokens(s2);
  if (u1.length === 0 || u2.length === 0) return false;
  const smaller = u1.length <= u2.length ? u1 : u2;
  const larger = u1.length <= u2.length ? u2 : u1;
  return smaller.every((w) => larger.includes(w));
};

export default facilityMatch;
