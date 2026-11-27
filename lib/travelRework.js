// Booked travel and "needs rework" flags for people who are taken off an event.
//
// "Travel booked" = an arrivals or departures row for that person and event with ANY entered detail (date, time, flight or train
// number, airline, airport, ground transport, notes). Empty placeholder rows are NOT travel booked.
// Booked rows are NEVER deleted by the staffing grid: they are kept and flagged (needs_rework + rework_note) so someone reworks them.
// If the two columns do not exist yet (the SQL has not been run), nothing breaks: the rows are simply kept, unflagged.

export const TRAVEL_TABLES = { arrivals: 'event_travel_arrivals', departures: 'event_travel_departures' }
const TIME_COL = { arrivals: 'arrival_time', departures: 'departure_time' }

export const hasTravelDetail = (r) => ['travel_date', 'arrival_time', 'departure_time', 'flight_number', 'airline', 'airport', 'transport', 'notes']
  .some(k => r[k] !== null && r[k] !== undefined && String(r[k]).trim() !== '')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthDay = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : '' }
const clock = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t || ''; const h = +m[1]; return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}` }
const MODE = { flight: 'Flight', train: 'Train', bus: 'Bus', driving: 'Driving', multiple: 'Travel' }

// "UA 1822 arriving Jan 21, 2:15 PM"
export function describeTravelRow(r, dir) {
  const carrier = [r.airline, r.flight_number].filter(Boolean).join(' ')
  const what = carrier || r.transport || (r.travel_type && MODE[r.travel_type]) || 'Travel'
  const when = [monthDay(r.travel_date), clock(r[TIME_COL[dir]])].filter(Boolean).join(', ')
  const parts = [what, when ? `${dir === 'arrivals' ? 'arriving' : 'departing'} ${when}` : (dir === 'arrivals' ? 'arrival' : 'departure')]
  if (r.airport) parts.push(`at ${r.airport}`)
  if (carrier && r.transport) parts.push(`(${r.transport})`)
  return parts.join(' ')
}

// "Maria has booked travel on Tulsa: UA 1822 arriving Jan 21, 2:15 PM; ..."
export const travelWarning = (name, city, rows) => `${name} has booked travel on ${city}: ${rows.map(x => describeTravelRow(x.r, x.dir)).join('; ')}.`

export const todayMonthDay = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getDate()}` }
export const moveNote = (fromCity, toCity) => `Moved from ${fromCity} to ${toCity}, ${todayMonthDay()}`
export const removeNote = (fromCity) => `Removed from ${fromCity}, ${todayMonthDay()}`

const isMissingColumn = (e) => !!e && (['42703', 'PGRST204', 'PGRST200'].includes(e.code) || /needs_rework|rework_note/i.test(e.message || ''))

// All of a person's travel rows for one event: [{ dir, t, r }]
export async function travelRowsOf(supabase, eventId, staffId) {
  const out = []
  for (const dir of ['arrivals', 'departures']) {
    const { data } = await supabase.from(TRAVEL_TABLES[dir]).select('*').eq('event_id', eventId).eq('staff_id', staffId)
    ;(data || []).forEach(r => out.push({ dir, t: TRAVEL_TABLES[dir], r }))
  }
  return out
}

// The booked rows (with details) that are not already flagged
export async function bookedTravelRows(supabase, eventId, staffId) {
  return (await travelRowsOf(supabase, eventId, staffId)).filter(x => hasTravelDetail(x.r) && !x.r.needs_rework)
}

// The person is leaving the event. Booked rows are kept and flagged; empty placeholder rows are removed when asked to.
// Returns { flagged, unsupported }.
export async function releaseTravelRows(supabase, { eventId, staffId, note, deletePlaceholders = false }) {
  let flagged = 0, unsupported = false
  for (const { t, r } of await travelRowsOf(supabase, eventId, staffId)) {
    if (hasTravelDetail(r)) {
      if (r.needs_rework) continue // already flagged: keep its first note
      const { error } = await supabase.from(t).update({ needs_rework: true, rework_note: note }).eq('id', r.id)
      if (error) { if (isMissingColumn(error)) unsupported = true; else console.error('flagging travel failed:', error) } else flagged++
    } else if (deletePlaceholders) {
      await supabase.from(t).delete().eq('id', r.id)
    }
  }
  return { flagged, unsupported }
}

export const UNSUPPORTED_MESSAGE = 'Booked travel was kept, but it could not be flagged yet: run the travel-rework SQL in Supabase.'
