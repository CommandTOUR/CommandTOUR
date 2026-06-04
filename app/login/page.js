'use client'

import { useState } from 'react'
import TopNav from '../components/TopNav'
import TourTiles from '../components/TourTiles'
import ThisWeek from '../components/ThisWeek'

export default function Dashboard() {
  const [view, setView] = useState('week') // 'week' | 'all'

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{ marginTop: 62, padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>Dashboard</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{monthLabel}</div>
          </div>
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid var(--glass-border)', borderRadius: 7, padding: 3, gap: 2,
          }}>
            {['week', 'all'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  fontFamily: 'Rubik, sans-serif', fontSize: 13,
                  padding: '6px 14px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  background: view === v ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: view === v ? 500 : 400,
                  transition: 'background 0.15s',
                }}
              >
                {v === 'week' ? 'This Week' : 'All Events'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
          <ThisWeek showAll={view === 'all'} />
          <TourTiles />
        </div>
      </div>
    </div>
  )
}