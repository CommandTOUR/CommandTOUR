'use client'

import TopNav from '../components/TopNav'
import TourTiles from '../components/TourTiles'
import ThisWeek from '../components/ThisWeek'

export default function Dashboard() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{
        marginTop: 62,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>Dashboard</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>June 2026</div>
          </div>
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid var(--glass-border)',
            borderRadius: 7,
            padding: 3,
            gap: 2,
          }}>
            <button style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}>This Week</button>
            <button style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-muted)',
            }}>All Events</button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 24,
          alignItems: 'start',
        }}>
          <ThisWeek />
          <TourTiles />
        </div>
      </div>
    </div>
  )
}