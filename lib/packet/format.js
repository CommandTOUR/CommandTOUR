// Formatting helpers for the Event Packet. Pure functions, no React.
import { formatLocation } from '../locationFormat'

export const staffName = (s) => s ? (s.display_name?.trim() || `${s.first_name || ''} ${s.last_name || ''}`.trim()) : ''

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseYmd(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '')
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null
}
export function fmtMonthDay(d) { const p = parseYmd(d); return p ? `${MONTHS[p.mo]} ${p.d}` : '' }
// "Sat, Mar 13"
export function fmtDay(d) {
  const p = parseYmd(d)
  return p ? `${DAYS[new Date(Date.UTC(p.y, p.mo, p.d)).getUTCDay()]}, ${MONTHS[p.mo]} ${p.d}` : ''
}
// "Sat, Mar 13, 2027"
export function fmtDate(d) { const p = parseYmd(d); return p ? `${fmtDay(d)}, ${p.y}` : '' }
// "Mar 13, 2027"
export function fmtLongDate(d) { const p = parseYmd(d); return p ? `${MONTHS[p.mo]} ${p.d}, ${p.y}` : '' }
// "2:30 PM" from "14:30:00" (anything else is printed as entered)
export function fmtTime(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '')
  if (!m) return t || ''
  const h = +m[1]
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

export function generatedDate(timeZone) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  try { return new Date().toLocaleDateString('en-US', { ...opts, timeZone: timeZone || 'UTC' }) } catch { return new Date().toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' }) }
}

// First and last day of the event across load-in, load-out, show days and Sunday.
export function eventDateRange(event, shows = []) {
  const days = [event.load_in_date, event.load_out_date, event.saturday_date, event.sunday_date, ...shows.map(s => s.show_date)].filter(Boolean).sort()
  return { start: days[0] || null, end: days[days.length - 1] || null }
}
export function fmtRange({ start, end }) {
  if (!start) return 'Dates TBD'
  return !end || end === start ? fmtMonthDay(start) : `${fmtMonthDay(start)} to ${fmtMonthDay(end)}`
}

export function sanitizeFileName(s) {
  return String(s ?? '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '') || 'Event Packet'
}

export const compactLocation = (event) => {
  const l = formatLocation(event.city, event.state, event.country, 'compact')
  return l === '—' ? 'Location TBD' : l
}

export function packetFolderName(ctx) {
  const { event, tour, shows } = ctx
  return sanitizeFileName(`${tour.name || 'Tour'} - ${compactLocation(event)} - ${fmtRange(eventDateRange(event, shows))}`)
}

export const STATUS_LABEL = { confirmed: 'Confirmed', tentative: 'Tentative', '1-hold': '1-Hold', '2-hold': '2-Hold', '3-hold': '3-Hold', 'date-hold': 'Date Hold' }
export const statusLabel = (s) => (s ? (STATUS_LABEL[s.toLowerCase()] || s.charAt(0).toUpperCase() + s.slice(1)) : '')
