// Shared look and helpers for the Travel Workspace.
export const GLASS = { background: 'var(--glass-tile-bg)', backdropFilter: 'blur(12px) saturate(1.4)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', boxShadow: 'var(--glass-tile-shadow)' }
export const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
export const HEADER_CELL = { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)' }
export const INPUT = { fontSize: 16, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
export const LABEL = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }
export const BTN_PRIMARY = { background: 'var(--color-info)', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 15, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }
export const BTN_GHOST = { background: 'transparent', border: '0.5px solid var(--color-info)', color: 'var(--color-info)', borderRadius: 8, fontSize: 15, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }
export const BTN_SMALL = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)' }

// Status pills: Title Case labels live in lib/travel/trips.js
export const STATUS_STYLES = {
  not_started: { color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.10)', border: 'var(--border-default)' },
  good_to_book: { color: 'var(--color-info)', bg: 'rgba(26,86,219,0.12)', border: 'rgba(26,86,219,0.35)' },
  pending_approval: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)' },
  booked: { color: 'var(--color-success)', bg: 'rgba(0,208,132,0.12)', border: 'rgba(0,208,132,0.35)' },
  cancelled: { color: 'var(--color-danger)', bg: 'rgba(255,69,58,0.10)', border: 'rgba(255,69,58,0.35)' },
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function fmtDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '')
  if (!m) return '—'
  return `${DAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}, ${MONTHS[+m[2] - 1]} ${+m[3]}`
}
// Times are shown exactly as entered (local time, no conversion)
export function fmtClock(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '')
  if (!m) return '—'
  const h = +m[1]
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}
export const personName = (s) => (s ? (s.display_name?.trim() || `${s.first_name || ''} ${s.last_name || ''}`.trim()) : '') || 'Unnamed'

export function StatusChip({ status, label, onClick, anchorRef, interactive }) {
  const st = STATUS_STYLES[status] || STATUS_STYLES.not_started
  return (
    <span
      ref={anchorRef}
      role={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, cursor: interactive ? 'pointer' : 'default', userSelect: 'none' }}
    >{label}</span>
  )
}
