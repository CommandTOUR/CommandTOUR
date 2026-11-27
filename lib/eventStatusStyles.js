// Event status colors, shared by the Master Schedule and the staffing tiles (single source of truth).
// Values are exactly the Master Schedule's: tinted background + border per status.
export const EVENT_STATUS_PILL_STYLES = {
  confirmed:   { color: 'var(--color-success)', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: 'var(--color-warning)', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: 'var(--color-warning)', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: 'var(--color-danger)', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}
