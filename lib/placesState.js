// State/province value for a Google Places result: 2-letter code (short_name)
// for the US and Canada, full name (long_name) everywhere else.
export function placeState(components = []) {
  const find = (type) => components.find(c => c.types.includes(type))
  const country = find('country')?.short_name
  const area = find('administrative_area_level_1')
  if (!area) return ''
  return (country === 'US' || country === 'CA') ? area.short_name : area.long_name
}
