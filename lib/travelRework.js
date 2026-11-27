// Booked travel and "needs rework" flags for people who are taken off an event. Reads and writes go through lib/travel/trips.js.
//
// "Travel booked" = a live trip (entered, not cancelled, not already flagged) for that person and event. Empty Hold trips are NOT booked travel.
// Booked trips are NEVER deleted by the staffing grid: they are kept and flagged (needs_rework + rework_note) so someone reworks them.
import { listBookedTrips, listTripsForStaffEvent, markReworkForStaff, isEntered, tripDate, tripTime, tripAirport, modeLabel } from './travel/trips'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthDay = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : '' }
const clock = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return t || ''; const h = +m[1]; return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}` }

// "UA 1822 arriving Jan 21, 2:15 PM at TUL"
export function describeTrip(trip) {
  const inbound = trip.direction === 'in'
  const segs = trip.segments || []
  const lead = inbound ? segs[segs.length - 1] : segs[0]
  const carrier = lead ? [lead.airline, lead.flight_number].filter(Boolean).join(' ') : ''
  const what = carrier || modeLabel(trip.mode) || 'Travel'
  const when = [monthDay(tripDate(trip)), clock(tripTime(trip))].filter(Boolean).join(', ')
  const parts = [what, when ? `${inbound ? 'arriving' : 'departing'} ${when}` : (inbound ? 'arrival' : 'departure')]
  const airport = tripAirport(trip)
  if (airport) parts.push(`at ${airport}`)
  return parts.join(' ')
}

// "Maria has booked travel on Tulsa: UA 1822 arriving Jan 21, 2:15 PM; ..."
export const travelWarning = (name, city, trips) => `${name} has booked travel on ${city}: ${trips.map(describeTrip).join('; ')}.`

export const todayMonthDay = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getDate()}` }
export const moveNote = (fromCity, toCity) => `Moved from ${fromCity} to ${toCity}, ${todayMonthDay()}`
export const removeNote = (fromCity) => `Removed from ${fromCity}, ${todayMonthDay()}`

// The live trips (with details) for one person on one event
export const bookedTravelTrips = (supabase, eventId, staffId) => listBookedTrips(supabase, eventId, staffId)

// The person is leaving the event. Entered trips are kept and flagged; empty trips are removed. Returns { flagged }.
export async function releaseTravel(supabase, { eventId, staffId, note }) {
  return { flagged: await markReworkForStaff(supabase, eventId, staffId, note) }
}

export { listTripsForStaffEvent, isEntered }
