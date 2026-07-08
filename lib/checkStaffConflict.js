// Weekend anchor logic mirrors getWeekendGroup/getWeekendDates in components/StaffingGrid.js:
// the "weekend" for a given load_in_date is the Friday–Sunday block it falls in, where
// Fri/Sat/Sun anchor back to that week's Friday and Mon–Thu roll FORWARD to the upcoming Friday.
function fridayOf(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const friday = new Date(date)
  if (day === 0) friday.setDate(date.getDate() - 2)
  else if (day === 6) friday.setDate(date.getDate() - 1)
  else if (day !== 5) friday.setDate(date.getDate() + (5 - day))
  return friday
}

function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function weekendDatesFor(dateStr) {
  const friday = fridayOf(dateStr)
  const saturday = new Date(friday); saturday.setDate(friday.getDate() + 1)
  const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2)
  return { saturday: toYMD(saturday), sunday: toYMD(sunday) }
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
