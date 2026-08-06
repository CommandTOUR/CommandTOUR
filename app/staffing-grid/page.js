'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0', marginBottom: 12, flexShrink: 0 }}>
        {/* Left: back button + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/staff')}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}>
            ← Back to Staff
          </button>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
            All Tours Staffing Grid
          </div>
        </div>

        {/* Right: show past toggle + year selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setShowPast(p => !p)}
            style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              border: showPast ? 'none' : '0.5px solid var(--border-default)',
              background: showPast ? 'var(--accent)' : 'transparent',
              color: showPast ? 'var(--surface-card)' : 'var(--text-secondary)',
              fontWeight: showPast ? 600 : 400,
            }}>
            {showPast ? 'Hide Past Events' : 'Show Past Events'}
          </button>

          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 0 0 0' }}>
        <StaffingGridComponent
          year={selectedYear}
          showPastEvents={showPast}
        />
      </div>
    </div>
  )
}
