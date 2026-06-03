'use client'
import TopNav from '../../components/TopNav'

export default function Reports() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>Reports</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Reports and exports will appear here.</div>
      </div>
    </div>
  )
}