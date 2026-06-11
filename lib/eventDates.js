// Determine the date that decides whether an event is "past"/complete:
// latest show date, falling back to sunday_date, then saturday_date, then load_in_date.
export function getEventCompletionDate(event, shows) {
  if (shows && shows.length > 0) {
    const dates = shows.map(s => s.show_date).filter(Boolean)
    if (dates.length > 0) return dates.reduce((max, d) => (d > max ? d : max))
  }
  if (event.sunday_date) return event.sunday_date
  if (event.saturday_date) return event.saturday_date
  return event.load_in_date
}
