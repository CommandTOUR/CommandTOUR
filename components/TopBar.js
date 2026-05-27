'use client'

export default function TopBar({ title, children }) {
  return (
    <div style={{
      height: 'var(--topbar-height)',
      borderBottom: '0.5px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 14,
      position: 'fixed',
      top: 0,
      left: 'var(--nav-width)',
      right: 0,
      zIndex: 99,
      background: 'var(--bg)',
    }}>
      <div style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>
        {title}
      </div>
      {children}
    </div>
  )
}