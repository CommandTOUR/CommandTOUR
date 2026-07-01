/**
 * Format a location for display per CommandTOUR spec.
 *
 * full (all countries):
 *   [city, state, country].filter(Boolean).join(', ')
 *
 * compact:
 *   North America (United States, Canada, Mexico): "City, ST" (no country)
 *   International: "City, Country" (state suppressed)
 *
 * @param {string|null} city
 * @param {string|null} state
 * @param {string|null} country
 * @param {'compact'|'full'} context - 'compact' for Staffing Grid/BC, 'full' for Tour detail/Event pages/PDF
 * @returns {string}
 */

const NORTH_AMERICA = ['United States', 'Canada', 'Mexico'];

export function formatLocation(city, state, country, context = 'full') {
  const c = city?.trim() || '';
  const s = state?.trim() || '';
  const co = country?.trim() || '';

  if (!c) return '—';

  if (context === 'compact') {
    const isNorthAmerica = NORTH_AMERICA.includes(co);
    if (isNorthAmerica) {
      // "City, ST" — state only, no country
      return s ? `${c}, ${s}` : c;
    } else {
      // "City, Country" — country only, no state
      return co ? `${c}, ${co}` : c;
    }
  }

  // full — same logic for all countries
  const parts = [c, s || null, co || null].filter(Boolean);
  return parts.join(', ');
}

/**
 * Returns a short country label for tight spaces (calendar dots, etc.)
 * Uses a proper lookup table instead of the current word-initial acronym generator.
 */
const COUNTRY_SHORT = {
  'United States': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',
  'United Kingdom': 'UK',
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Italy': 'IT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Portugal': 'PT',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Singapore': 'SG',
  'Thailand': 'TH',
  'South Africa': 'ZA',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
};

export function shortCountry(country) {
  if (!country) return '';
  return COUNTRY_SHORT[country] || country.slice(0, 2).toUpperCase();
}
