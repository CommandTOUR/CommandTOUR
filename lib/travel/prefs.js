// What we already know about a traveler, to save typing in the trip form: home airport, preferred airline, and their own airlines and airports.
// Reads staff profile tables only (staff, staff_airports, staff_airlines); trips themselves go through lib/travel/trips.js.
export async function loadTravelerPrefs(supabase, staffId) {
  if (!staffId) return { homeAirport: '', preferredAirline: '', airlines: [], airports: [] }
  const [staff, airports, airlines] = await Promise.all([
    supabase.from('staff').select('home_airport').eq('id', staffId).maybeSingle(),
    supabase.from('staff_airports').select('iata_code, is_primary, sort_order').eq('staff_id', staffId).order('sort_order', { ascending: true }),
    supabase.from('staff_airlines').select('airline, preferred').eq('staff_id', staffId),
  ])
  const ports = airports.data || []
  const primary = ports.find(p => p.is_primary) || null
  const own = [...new Set([primary?.iata_code, ...ports.map(p => p.iata_code), staff.data?.home_airport].filter(Boolean).map(c => String(c).trim().toUpperCase()))]
  const lines = airlines.data || []
  const preferred = lines.find(a => a.preferred)?.airline || ''
  return {
    homeAirport: (primary?.iata_code || staff.data?.home_airport || '').toString().trim().toUpperCase(),
    preferredAirline: preferred,
    airlines: [...new Set([preferred, ...lines.map(a => a.airline)].filter(Boolean))],
    airports: own,
  }
}
