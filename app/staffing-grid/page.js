'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import StaffingGrid from '@/components/StaffingGrid'

export default function AllToursStaffingGridPage() {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

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
            style={{ fontSize: 14, padding: '6px 14px', borderRadius: 7, border: '1px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
            ← Back to Staff
          </button>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
            All Staff
          </div>
        </div>

        {/* Center: search bar */}
        <div style={{ flex: 1, maxWidth: 480, margin: '0 24px' }}>
          <input
            type="text"
            placeholder="Search City, Venue, Staff, Date, Position..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              fontSize: 15,
              padding: '7px 14px',
              borderRadius: 8,
              border: '0.5px solid var(--border-default)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Right: year selector (the Show Past Events toggle is in the grid's toolbar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ fontSize: 15, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', height: 34 }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 0 0 0' }}>
        <StaffingGrid
          year={selectedYear}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}