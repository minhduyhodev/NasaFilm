/**
 * Build a flagcdn.com URL from an ISO 3166-1 alpha-2 country code.
 * @param {string | null | undefined} code e.g. "VN", "US"
 * @param {40 | 80 | 160} [width=40]
 * @returns {string | null}
 */
export function getCountryFlagUrl(code, width = 40) {
  if (!code || typeof code !== 'string') return null;
  const iso = code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(iso)) return null;
  const w = [40, 80, 160].includes(width) ? width : 40;
  return `https://flagcdn.com/w${w}/${iso}.png`;
}
