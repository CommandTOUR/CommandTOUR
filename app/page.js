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
      <div style={{ marginTop: 62, padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Dashboard</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{monthLabel}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
          <ThisWeek />
          <TourTiles />
        </div>
      </div>
    </div>
  )
}