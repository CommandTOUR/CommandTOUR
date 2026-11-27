// Shared look and helpers for the Travel Workspace. Structure, proportions and spacing follow docs/mockups/travel-workspace.html;
// colors and type come from the app's own tokens.
export const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
export const LINE = 'var(--border-default)'
export const CARD = { background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 8 }
export const SMALL_LABEL = { fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted-legible)' }
export const TH = { ...SMALL_LABEL, textAlign: 'left', padding: '9px 10px', borderBottom: `1px solid ${LINE}`, background: 'var(--surface-raised, rgba(0,0,0,0.03))', whiteSpace: 'nowrap' }
export const TD = { padding: '9px 10px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'middle', fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
export const INPUT = { fontSize: 15, padding: '8px 10px', borderRadius: 6, border: `1px solid ${LINE}`, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
export const BTN = { fontFamily: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 6, padding: '8px 14px', border: `1px solid ${LINE}`, background: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer' }
export const BTN_P = { ...BTN, background: 'var(--color-info)', borderColor: 'var(--color-info)', color: 'var(--text-on-info)' }
export const BTN_S = { ...BTN, padding: '5px 10px', fontSize: 13 }

// Chips (mockup .chip / c-g / c-b / c-a / c-p / c-n / c-r)
const tone = (c, text = c) => ({ color: text, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 38%, transparent)` })
export const CHIP_TONES = {
  green: tone('var(--color-success)'), blue: tone('var(--color-info)'), amber: tone('var(--color-warning)', 'var(--text-warning-legible)'),
  purple: tone('#a855f7', 'var(--text-purple-legible)'), grey: { color: 'var(--text-muted-legible)', background: 'rgba(100,116,139,0.10)', border: `1px solid ${LINE}` }, red: tone('var(--color-danger)'),
}
export const STATUS_TONE = { not_started: 'amber', good_to_book: 'blue', pending_approval: 'purple', booked: 'green', cancelled: 'red' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function fmtDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '')
  if (!m) return '—'
  return `${DAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}, ${MONTHS[+m[2] - 1]} ${+m[3]}`
}
export const personName = (s) => (s ? (s.display_name?.trim() || `${s.first_name || ''} ${s.last_name || ''}`.trim()) : '') || 'Unnamed'

export function Chip({ tone: t = 'grey', children, onClick, anchorRef, title }) {
  return (
    <span ref={anchorRef} title={title} role={onClick ? 'button' : undefined} onClick={onClick}
      style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default', userSelect: 'none', ...CHIP_TONES[t] }}>{children}</span>
  )
}
