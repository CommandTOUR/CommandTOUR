'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import TopNav from '@/components/TopNav'
import StaffingGridComponent from '@/components/StaffingGrid'

export default function AllToursStaffingGridPage() {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [showPast, setShowPast] = useState(false)
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    const fetchYears = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('events').select('load_in_date')
      const years = [...new Set((data || [])
        .map(ev => ev.load_in_date ? new Date(ev.load_in_date + 'T00:00:00').getFullYear() : null)
        .filter(Boolean))].sort((a, b) => a - b)
      setAvailableYears(years)
      if (years.length > 0 && !years.includes(new Date().getFullYear())) {
        setSelectedYear(years[years.length - 1])
      }
    }
    fetchYears()
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <TopNav />

      {/* Header bar */}
      <div style={{ marginTop: 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48, flexShrink: 0, position: 'relative' }}>
        {/* Left: back button */}
        <button
          onClick={() => router.push('/staff')}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--color-mint)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}>
          ← Back to Staff
        </button>

        {/* Center: title (absolutely centered) */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          All Tours Staffing Grid
        </div>

        {/* Right: show past toggle + year selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setShowPast(p => !p)}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border-card)', background: showPast ? 'var(--bg-card-hover)' : 'transparent', color: showPast ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {showPast ? 'Hide Past Events' : 'Show Past Events'}
          </button>

          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid — fills remaining height */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <StaffingGridComponent
          year={selectedYear}
          showPastEvents={showPast}
        />
      </div>
    </div>
  )
}
