// Weekend helpers for the staffing views. All of them delegate to lib/staffingRule.js (the one weekend rule).
import { weekendKey, weekendDatesFor } from '@/lib/staffingRule'

export function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

// Friday (YYYY-MM-DD) of the weekend a load-in date belongs to
export const getWeekendGroup = (dateStr) => weekendKey(dateStr)

export function getWeekendDates(dateStr) {
  const w = weekendDatesFor(dateStr)
  return w ? { saturday_date: w.saturday, sunday_date: w.sunday } : { saturday_date: null, sunday_date: null }
}

export function fmtWeekend(fridayStr) {
  if (!fridayStr) return ''
  const fri = new Date(fridayStr + 'T00:00:00')
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
  const opts = { month: 'short', day: 'numeric' }
  return fri.toLocaleDateString('en-US', opts) + ' – ' + sun.toLocaleDateString('en-US', opts)
}

// Last day of an event: its load-out, else the Sunday of its weekend. An event is "past" once that day is before today.
export function eventEndDate(ev) {
  if (!ev?.load_in_date) return null
  const sunday = weekendDatesFor(ev.load_in_date)?.sunday
  return [ev.load_out_date, sunday, ev.load_in_date].filter(Boolean).sort().pop()
}
export const isPastEvent = (ev, today = toYMD(new Date())) => { const end = eventEndDate(ev); return !!end && end < today }
