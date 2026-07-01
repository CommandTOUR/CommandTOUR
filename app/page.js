'use client'

import { useState, useEffect } from 'react'
import TopNav from '../components/TopNav'
import TourTiles from '../components/TourTiles'
import ThisWeek from '../components/ThisWeek'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function formatTime(d) {
  const h = d.getHours()
  const hour = h % 12 || 12
  const ampm = h >= 12 ? 'PM' : 'AM'
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hour}:${mm}:${ss} ${ampm}`
}

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default function Dashboard() {
  const [now, setNow] = useState(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88 }}>
        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 88, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</div>
            {now && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--text-primary)' }}>
                  {formatDate(now)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.03em', color: 'var(--color-mint)', fontVariantNumeric: 'tabular-nums', display: 'inline-block', minWidth: 'max-content' }}>
                  {formatTime(now)}
                </span>
              </div>
            )}
          </div>
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
