'use client'

import SideNav from '../components/SideNav'
import TopBar from '../components/TopBar'
import TourTiles from '../components/TourTiles'
import ThisWeek from '../components/ThisWeek'

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <SideNav />
      <div style={{
        marginLeft: 'var(--nav-width)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>
        <TopBar title="Dashboard">
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            May 2026
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
              fontSize: 11.5,
              padding: '4px 11px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}>This Week</button>
            <button style={{
              fontFamily: 'Rubik, sans-serif',
              fontSize: 11.5,
              padding: '4px 11px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-muted)',
            }}>All Events</button>
          </div>
          <button className="btn-primary">
            + New Tour
          </button>
        </TopBar>

        {/* Content */}
        <div style={{
          marginTop: 'var(--topbar-height)',
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: 20,
          }}>
            <ThisWeek />
            <TourTiles />
          </div>
        </div>

      </div>
    </div>
  )
}