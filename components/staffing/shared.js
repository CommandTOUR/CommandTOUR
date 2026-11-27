// Shared constants and helpers for the staffing tiles

// Border widths for the staffing tiles: tune them here
export const EVENT_TILE_BORDER = 2 // px, tour color
export const STAFF_TILE_BORDER = 1 // px, neutral border (solid; dashed for open / locked)

// Layout (px). Tuned in one place.
export const LABEL_W = 150            // position label column (sticky on the left)
export const COL_W = 192              // one event column
export const EVENT_GAP = 6            // between event columns in a weekend
export const WEEKEND_GAP = 16         // between weekend groups
export const WEEKEND_LABEL_H = 24     // weekend label row
export const VIEW_PAD = 4             // panel padding around the whole view
export const STRIP_PAD_BOTTOM = 6     // opaque padding under the pinned header strip (the "splitter")
export const STAFF_TILE_MIN_H = 28    // compact: one line, name + dot
export const STAFF_TILE_PAD = '3px 4px 3px 8px'
export const CELL_PAD = 3             // around the tiles in a cell
export const CELL_GAP = 3             // between tiles in a cell
export const ROW_DIVIDER = '1px solid var(--border-default)'

export function staffDisplayName(staff) {
  if (!staff) return ''
  return staff.display_name?.trim() || `${staff.first_name} ${staff.last_name}`
}

export const EVENT_STATUS_STYLES = {
  confirmed: { label: 'Confirmed', color: 'var(--status-confirmed-text)', bg: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  '1-hold': { label: '1-Hold', color: 'var(--status-1hold-text)', bg: 'var(--status-1hold-bg)', border: 'var(--status-1hold-border)' },
  '2-hold': { label: '2-Hold', color: 'var(--status-2hold-text)', bg: 'var(--status-2hold-bg)', border: 'var(--status-2hold-border)' },
  '3-hold': { label: '3+ Hold', color: 'var(--status-3hold-text)', bg: 'var(--status-3hold-bg)', border: 'var(--status-3hold-border)' },
  tentative: { label: 'Tentative', color: 'var(--status-tentative-text)', bg: 'var(--status-tentative-bg)', border: 'var(--status-tentative-border)' },
  'date-hold': { label: 'Date Hold', color: 'var(--status-datehold-text)', bg: 'var(--status-datehold-bg)', border: 'var(--status-datehold-border)' },
}

// Staff assignment statuses (border color, chip background, pill border)
export const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: 'var(--color-success)', pill: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  { value: 'pending', label: 'Pending', color: 'var(--color-warning)', pill: 'var(--status-1hold-bg)', border: 'var(--status-1hold-border)' },
  { value: 'variant', label: 'Variant', color: 'var(--color-info)', pill: 'color-mix(in srgb, var(--color-info) 12%, transparent)', border: 'color-mix(in srgb, var(--color-info) 40%, transparent)' },
  { value: 'needs_attention', label: 'Needs Attention', color: 'var(--color-danger)', pill: 'var(--status-3hold-bg)', border: 'var(--status-3hold-border)' },
]
export const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o]))

// styles map for QuickStatusPill
export const STATUS_PILL_STYLES = Object.fromEntries(
  STATUS_OPTIONS.map(o => [o.value, { color: o.color, background: o.pill, border: o.border }])
)

export const fmtShortDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

export function fmtEventRange(ev) {
  if (!ev?.load_in_date) return 'Dates TBD'
  const a = fmtShortDate(ev.load_in_date)
  if (!ev.load_out_date || ev.load_out_date === ev.load_in_date) return a
  return `${a} – ${fmtShortDate(ev.load_out_date)}`
}

// Stacking order for everything that pops up over the grid. All of them render in a portal on document.body.
export const Z_PANEL = 9000      // side panel
export const Z_POPUP = 10000     // modals and dialogs
export const Z_MENU = 10100      // dropdown menus (set status, name search, status dot)
export const Z_TOAST = 100000    // toasts, always on top
