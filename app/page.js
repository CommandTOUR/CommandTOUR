'use client'

import TopNav from '../components/TopNav'
import TourTiles from '../components/TourTiles'
import ThisWeek from '../components/ThisWeek'

export default function Dashboard() {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>
        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>Dashboard</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{monthLabel}</div>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
            <ThisWeek />
            <TourTiles />
          </div>
        </div>
      </div>
    </div>
  )
}