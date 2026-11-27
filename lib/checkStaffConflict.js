import { weekendDatesFor as sharedWeekendDatesFor } from './staffingRule'

// The weekend rule lives in lib/staffingRule.js (single source of truth).
function weekendDatesFor(dateStr) {
  return sharedWeekendDatesFor(dateStr)
}

export async function checkStaffConflict(staffId, eventId, supabase) {
  // Fetch the target event's load_in_date
  const { data: targetEvent } = await supabase
    .from('events')
    .select('id, load_in_date, tour_id')
    .eq('id', eventId)
    .single()

  if (!targetEvent?.load_in_date) {
    return { hasConflict: false, isHardBlock: false, conflictingEvent: null, conflictingAssignment: null }
  }

  const { saturday: satStr, sunday: sunStr } = weekendDatesFor(targetEvent.load_in_date)

  // Find all assignments for this staff member on other events
  const { data: otherAssignments } = await supabase
    .from('staff_assignments')
    .select(`
      id, status, confirmed, event_id,
      events:event_id(id, load_in_date, city, state,
        country, venue_name, tour_id,
        tours:tour_id(name))
    `)
    .eq('staff_id', staffId)
    .neq('event_id', eventId)
    .not('event_id', 'is', null)

  if (!otherAssignments?.length) {
    return { hasConflict: false, isHardBlock: false, conflictingEvent: null, conflictingAssignment: null }
  }

  // Filter to assignments that fall on the same weekend
  const conflicts = otherAssignments.filter(a => {
    const evDate = a.events?.load_in_date
    if (!evDate) return false
    const { saturday: evSat, sunday: evSun } = weekendDatesFor(evDate)
    return evSat === satStr || evSun === sunStr
  })

  if (!conflicts.length) {
    return { hasConflict: false, isHardBlock: false, conflictingEvent: null, conflictingAssignment: null }
  }

  // Check if any conflict involves a confirmed assignment
  const isHardBlock = conflicts.some(a => a.confirmed === true || a.status === 'confirmed')

  console.log('checkStaffConflict result', {
    staffId, eventId, hasConflict: true, isHardBlock,
    conflicts: conflicts.map(c => ({
      id: c.id,
      status: c.status,
      confirmed: c.confirmed,
      city: c.events?.city
    }))
  })

  return {
    hasConflict: true,
    isHardBlock,
    conflictingEvent: conflicts[0].events,
    conflictingAssignment: conflicts[0]
  }
}
