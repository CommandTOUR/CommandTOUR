'use client'
import TopNav from '../../components/TopNav'

export default function Tours() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>Tours</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>All tours will appear here.</div>
      </div>
    </div>
  )
}