// The ONLY place that reads or writes trips and trip_segments.
//
// A trip is one person travelling to ("in") or from ("out") one event, with any number of ordered segments (legs).
// Every function takes the caller's Supabase client first, so row-level security applies (browser client in the app,
// session client in the packet route). Nothing here uses a service role key.
//
// Rules:
//  - A trip row is created only when someone enters travel. Never create blank placeholder rows.
//  - A trip "counts as entered" when its status is not Not Started, or it has any segment, or a confirmation.
//    Empty Not Started trips are ignored by warnings, flags and the packet.
//  - After every create, status change and delete, syncAssignmentFlags keeps staff_assignments.booked / good_to_book in step,
//    so the dots on the staffing grid keep working as they always did.

export const TRIP_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'good_to_book', label: 'Good To Book' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'booked', label: 'Booked' },
  { value: 'cancelled', label: 'Cancelled' },
]
export const TRIP_MODES = [
  { value: 'flying', label: 'Flying' },
  { value: 'driving', label: 'Driving' },
  { value: 'carpool', label: 'Carpool' },
  { value: 'books_own', label: 'Books Own' },
  { value: 'rail', label: 'Rail' },
  { value: 'other', label: 'Other' },
]
export const TRIP_TYPES = [
  { value: 'round_trip', label: 'Round Trip' },
  { value: 'one_way_in', label: 'One-Way In' },
  { value: 'one_way_out', label: 'One-Way Out' },
  { value: 'multi_city', label: 'Multi-City' },
]
export const statusLabel = (v) => TRIP_STATUSES.find(s => s.value === v)?.label || v
export const modeLabel = (v) => TRIP_MODES.find(m => m.value === v)?.label || v
// Driving, Carpool and Books Own have no flight details (just when they travel)
export const hasFlightFields = (mode) => !['driving', 'carpool', 'books_own'].includes(mode)
// segment mode that goes with a trip mode
export const segmentModeFor = (mode) => (mode === 'flying' ? 'flight' : mode === 'rail' ? 'rail' : hasFlightFields(mode) ? 'other' : 'drive')

const TRIP_SELECT = '*, segments:trip_segments(*), staff:staff_id(id, first_name, last_name, display_name)'
const bySeq = (a, b) => (a.seq || 0) - (b.seq || 0)
const clean = (t) => ({ ...t, segments: [...(t.segments || [])].sort(bySeq) })
const filled = (v) => v !== null && v !== undefined && String(v).trim() !== ''

export const isEntered = (trip) => !!trip && (trip.status !== 'not_started' || (trip.segments || []).length > 0 || filled(trip.confirmation))
// entered, not cancelled, not waiting on rework: the trips that count as booked travel on an event
export const isLive = (trip) => isEntered(trip) && trip.status !== 'cancelled' && !trip.needs_rework

// The date a trip is "on": the final arrival for trips to the event, the first departure for trips from it.
export function tripDate(trip) {
  const s = trip?.segments || []
  if (!s.length) return null
  return trip.direction === 'in'
    ? (s[s.length - 1].arrive_date || s[s.length - 1].depart_date || null)
    : (s[0].depart_date || s[0].arrive_date || null)
}
export const tripTime = (trip) => {
  const s = trip?.segments || []
  if (!s.length) return null
  return trip.direction === 'in' ? (s[s.length - 1].arrive_time || null) : (s[0].depart_time || null)
}
export const tripAirport = (trip) => {
  const s = trip?.segments || []
  if (!s.length) return null
  return trip.direction === 'in' ? (s[s.length - 1].to_airport || null) : (s[0].from_airport || null)
}

async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function listTripsForEvent(supabase, eventId) {
  const rows = await must(supabase.from('trips').select(TRIP_SELECT).eq('event_id', eventId), 'Trips')
  return (rows || []).map(clean)
}

export async function listTripsForStaffEvent(supabase, eventId, staffId) {
  const rows = await must(supabase.from('trips').select(TRIP_SELECT).eq('event_id', eventId).eq('staff_id', staffId), 'Trips')
  return (rows || []).map(clean)
}

// Trips that need rework, across events (the staffing grid's flagged travel)
export async function listReworkTrips(supabase, eventIds) {
  if (!eventIds.length) return []
  const rows = await must(supabase.from('trips').select(TRIP_SELECT).in('event_id', eventIds).eq('needs_rework', true), 'Trips')
  return (rows || []).map(clean)
}

// Entered, live trips for one person on one event: what a warning needs to say
export async function listBookedTrips(supabase, eventId, staffId) {
  return (await listTripsForStaffEvent(supabase, eventId, staffId)).filter(isLive)
}

// ── writes ─────────────────────────────────────────────────────────────────

const TRIP_FIELDS = ['mode', 'trip_type', 'status', 'confirmation', 'notes', 'flagged']

// Create or update the trip for (event, person, direction). Returns the trip (with segments).
export async function upsertTrip(supabase, eventId, staffId, direction, fields = {}) {
  const patch = { updated_at: new Date().toISOString() }
  for (const k of TRIP_FIELDS) if (k in fields) patch[k] = filled(fields[k]) || typeof fields[k] === 'boolean' ? fields[k] : null
  const row = await must(supabase.from('trips')
    .upsert({ event_id: eventId, staff_id: staffId, direction, ...patch }, { onConflict: 'event_id,staff_id,direction' })
    .select(TRIP_SELECT).single(), 'Save trip')
  await syncAssignmentFlags(supabase, eventId, staffId)
  return clean(row)
}

// Replace a trip's segments with this list (renumbered 1..n)
export async function saveSegments(supabase, tripId, segments) {
  const rows = segments.map((s, i) => ({
    trip_id: tripId, seq: i + 1, mode: s.mode || 'flight',
    airline: s.airline || null, flight_number: s.flight_number || null,
    from_airport: s.from_airport ? s.from_airport.toUpperCase() : null, to_airport: s.to_airport ? s.to_airport.toUpperCase() : null,
    depart_date: s.depart_date || null, depart_time: s.depart_time || null, arrive_date: s.arrive_date || null, arrive_time: s.arrive_time || null,
    confirmation: s.confirmation || null, notes: s.notes || null,
  }))
  await must(supabase.from('trip_segments').delete().eq('trip_id', tripId), 'Clear segments')
  if (rows.length) await must(supabase.from('trip_segments').insert(rows), 'Save segments')
  const trip = await must(supabase.from('trips').update({ updated_at: new Date().toISOString() }).eq('id', tripId).select('id, event_id, staff_id').single(), 'Save segments')
  await syncAssignmentFlags(supabase, trip.event_id, trip.staff_id)
  return rows.length
}

export async function setTripStatus(supabase, tripId, status) {
  const row = await must(supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId).select('id, event_id, staff_id').single(), 'Change status')
  await syncAssignmentFlags(supabase, row.event_id, row.staff_id)
}

// Delete a trip. Returns the deleted trip (with segments) so a caller can offer Undo.
export async function deleteTrip(supabase, tripId) {
  const trip = clean(await must(supabase.from('trips').select(TRIP_SELECT).eq('id', tripId).single(), 'Trip'))
  await must(supabase.from('trips').delete().eq('id', tripId), 'Delete trip')
  await syncAssignmentFlags(supabase, trip.event_id, trip.staff_id)
  return trip
}

// A person is leaving an event: entered trips are KEPT and flagged needs_rework with a note (booked travel is never silently deleted);
// empty Not Started trips are removed. Returns the number flagged.
export async function markReworkForStaff(supabase, eventId, staffId, note) {
  const trips = await listTripsForStaffEvent(supabase, eventId, staffId)
  let flagged = 0
  for (const t of trips) {
    if (isEntered(t)) {
      if (t.needs_rework) continue // already flagged: keep its first note
      await must(supabase.from('trips').update({ needs_rework: true, rework_note: note, updated_at: new Date().toISOString() }).eq('id', t.id), 'Flag trip')
      flagged++
    } else {
      await must(supabase.from('trips').delete().eq('id', t.id), 'Remove empty trip')
    }
  }
  await syncAssignmentFlags(supabase, eventId, staffId)
  return flagged
}

export async function resolveRework(supabase, tripId) {
  const row = await must(supabase.from('trips').update({ needs_rework: false, rework_note: null, updated_at: new Date().toISOString() }).eq('id', tripId).select('id, event_id, staff_id').single(), 'Resolve')
  await syncAssignmentFlags(supabase, row.event_id, row.staff_id)
}

// Someone is confirmed on / unconfirmed from an event: mark their trips flagged (not confirmed) or clear it. Never creates trips.
export async function setTripsFlagged(supabase, eventId, staffId, flagged) {
  await must(supabase.from('trips').update({ flagged }).eq('event_id', eventId).eq('staff_id', staffId), 'Flag trips')
}

// booked: at least one non-cancelled trip and every non-cancelled trip is Booked.
// good_to_book: any non-cancelled trip is Good To Book or Booked.
// Trips waiting on rework do not count (the person left the event). Only entered trips count.
export function computeFlags(trips) {
  const live = trips.filter(t => isEntered(t) && t.status !== 'cancelled' && !t.needs_rework)
  return {
    booked: live.length > 0 && live.every(t => t.status === 'booked'),
    good_to_book: live.some(t => t.status === 'good_to_book' || t.status === 'booked'),
  }
}

export async function syncAssignmentFlags(supabase, eventId, staffId) {
  const trips = await listTripsForStaffEvent(supabase, eventId, staffId)
  const flags = computeFlags(trips)
  const { error } = await supabase.from('staff_assignments').update(flags).eq('event_id', eventId).eq('staff_id', staffId).is('deleted_at', null)
  if (error) console.error('Could not sync booking flags:', error.message)
  return flags
}
