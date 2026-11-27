// THE double-booking rule, in one dependency-free module (so it can be unit tested).
// Today's rule, unchanged: only load_in_date counts. A date maps to its Friday-Sunday weekend
// (Fri/Sat/Sun anchor back to that week's Friday; Mon-Thu roll FORWARD to the upcoming Friday).
// Two events overlap when their derived Saturday or Sunday match. load_out_date is never used, so a
// missing load-out changes nothing; an event with no load_in_date never conflicts.

function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

export function fridayOf(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay() // 0=Sun ... 6=Sat
  const friday = new Date(date)
  if (day === 0) friday.setDate(date.getDate() - 2)
  else if (day === 6) friday.setDate(date.getDate() - 1)
  else if (day !== 5) friday.setDate(date.getDate() + (5 - day))
  return friday
}

export function weekendDatesFor(dateStr) {
  if (!dateStr) return null
  const friday = fridayOf(dateStr)
  const saturday = new Date(friday); saturday.setDate(friday.getDate() + 1)
  const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2)
  return { saturday: toYMD(saturday), sunday: toYMD(sunday) }
}

// The Friday (YYYY-MM-DD) that anchors a date's weekend. Used to group events into weekends in the UI.
export function weekendKey(dateStr) {
  return dateStr ? toYMD(fridayOf(dateStr)) : null
}

export function eventsOverlap(dateA, dateB) {
  const a = weekendDatesFor(dateA)
  const b = weekendDatesFor(dateB)
  if (!a || !b) return false
  return a.saturday === b.saturday || a.sunday === b.sunday
}

const fmtShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// "Dallas, Oct 30 to Nov 1" (or just the load-in date when there is no load-out)
export function describeEvent(ev) {
  if (!ev) return 'another event'
  const city = ev.city || 'another event'
  if (!ev.load_in_date) return city
  const out = ev.load_out_date && ev.load_out_date !== ev.load_in_date ? ` to ${fmtShort(ev.load_out_date)}` : ''
  return `${city}, ${fmtShort(ev.load_in_date)}${out}`
}

// assignments: [{ id, event_id, events: { id, load_in_date, load_out_date, city }, ... }] for ONE person.
// Returns the ones that overlap the target event (including the person's own rows on the target event itself),
// minus any whose id is in ignoreAssignmentIds (e.g. the row being moved).
export function findOverlaps({ targetEvent, assignments, ignoreAssignmentIds = [] }) {
  if (!targetEvent || !targetEvent.load_in_date) return []
  const ignore = new Set(ignoreAssignmentIds)
  return (assignments || []).filter(a => {
    if (ignore.has(a.id)) return false
    if (a.event_id === targetEvent.id) return true
    const evDate = a.events?.load_in_date
    return !!evDate && eventsOverlap(evDate, targetEvent.load_in_date)
  })
}

export function overlapReason(conflicts) {
  if (!conflicts || conflicts.length === 0) return ''
  return `Already on ${describeEvent(conflicts[0].events)} that weekend. Remove them from it first.`
}
