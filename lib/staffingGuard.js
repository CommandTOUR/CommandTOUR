import { getSupabase } from './supabase'
import { findOverlaps, overlapReason } from './staffingRule'

// All of a person's assignments with their events (one query). Used at write time and, cached by the UI, on dragstart.
export async function fetchBookings(personId, supabase = getSupabase()) {
  const { data, error } = await supabase
    .from('staff_assignments')
    .select('id, event_id, tour_position_id, slot_index, staff_id, status, confirmed, tour_positions(positions(title)), events:event_id(id, load_in_date, load_out_date, city, state, tour_id)')
    .eq('staff_id', personId)
    .not('event_id', 'is', null)
  if (error) throw error
  return data || []
}

// The ONE guard every write path calls. Queries the database (not just loaded events).
//   canAssign(personId, targetEventId, { ignoreAssignmentIds, bookings })
// `bookings` may be passed only for UI hints (dragstart); write paths leave it out so the check is fresh.
export async function canAssign(personId, targetEventId, { ignoreAssignmentIds = [], bookings = null, client = null } = {}) {
  const supabase = client || getSupabase() // `client` is only for scripts/tests
  const { data: targetEvent, error } = await supabase
    .from('events').select('id, load_in_date, load_out_date, city, state, tour_id').eq('id', targetEventId).single()
  if (error || !targetEvent) return { ok: false, conflicts: [], reason: 'Could not read the target event', error }
  let rows
  try { rows = bookings || await fetchBookings(personId, supabase) } catch (e) {
    return { ok: false, conflicts: [], reason: 'Could not check existing bookings', error: e }
  }
  const conflicts = findOverlaps({ targetEvent, assignments: rows, ignoreAssignmentIds })
  return { ok: conflicts.length === 0, conflicts, reason: overlapReason(conflicts), targetEvent }
}

// Pure helper for the UI: which of the loaded events this person cannot go to (eventId -> reason)
export function blockedEventsFor(bookings, events, { ignoreAssignmentIds = [], exceptEventId = null } = {}) {
  const out = {}
  for (const ev of events) {
    if (ev.id === exceptEventId) continue
    const conflicts = findOverlaps({ targetEvent: ev, assignments: bookings, ignoreAssignmentIds })
    if (conflicts.length) out[ev.id] = overlapReason(conflicts)
  }
  return out
}
