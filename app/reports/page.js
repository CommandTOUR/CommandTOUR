'use client'
import TopNav from '../../components/TopNav'

export default function Reports() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reports</div>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reports and exports will appear here.</div>
        </div>
      </div>
    </div>
  )
}