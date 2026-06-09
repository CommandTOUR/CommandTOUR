'use client'
import TopNav from '../../components/TopNav'

export default function Settings() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Settings</div>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Account and system settings will appear here.</div>
        </div>
      </div>
    </div>
  )
}