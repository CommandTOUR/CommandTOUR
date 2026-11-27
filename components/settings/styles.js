// Shared look for Settings screens (same values the Settings page has always used).
export const INPUT = {
  fontSize: 16,
  padding: '10px 14px',
  borderRadius: 8,
  border: '0.5px solid var(--border-default)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export const LABEL = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 8,
}

export const BTN_PRIMARY = {
  background: 'var(--color-info)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  padding: '9px 18px',
  cursor: 'pointer',
}

export const BTN_GHOST = {
  background: 'transparent',
  border: '0.5px solid var(--color-info)',
  color: 'var(--color-info)',
  borderRadius: 8,
  fontSize: 15,
  padding: '8px 16px',
  cursor: 'pointer',
}

export function SectionCard({ title, description, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-info)', marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 12 }}>{description}</div>}
      <div style={{ background: 'var(--glass-tile-bg)', backdropFilter: 'blur(12px) saturate(1.4)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', boxShadow: 'var(--glass-tile-shadow)', padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  )
}
