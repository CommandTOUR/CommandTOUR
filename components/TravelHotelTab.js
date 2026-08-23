'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

const GLASS = { background: 'var(--glass-tile-bg)', backdropFilter: 'blur(12px) saturate(1.4)', border: '0.5px solid var(--glass-tile-border)', borderRadius: 14, boxShadow: 'var(--glass-tile-shadow)' }

const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Twin']

const OVERLAY = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }

const SECTION_LABEL = { fontSize: 15, fontWeight: 700, color: 'var(--color-info)' }

const ADD_BTN = { fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }

const CANCEL_BTN = { fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }

const SYSTEM_INPUT = { fontSize: 14, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', caretColor: 'var(--color-info)', outline: 'none', width: '100%' }

const SYSTEM_SELECT = { fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', width: '100%', appearance: 'none', WebkitAppearance: 'none' }

const TRAVEL_TYPE_STYLES = {
  flight:  { label: 'Flight',  bg: 'rgba(26,86,219,0.12)',  color: 'var(--color-info)',    border: '0.5px solid rgba(26,86,219,0.35)' },
  train:   { label: 'Train',   bg: 'rgba(0,208,132,0.12)',  color: 'var(--color-success)', border: '0.5px solid rgba(0,208,132,0.35)' },
  bus:     { label: 'Bus',     bg: 'rgba(255,184,0,0.12)',  color: 'var(--color-warning)', border: '0.5px solid rgba(255,184,0,0.35)' },
  driving: { label: 'Driving', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',              border: '0.5px solid rgba(168,85,247,0.35)' },
}

const hoverBlue = e => { e.currentTarget.style.background = 'rgba(26,86,219,0.08)' }
const unhoverBlue = e => { e.currentTarget.style.background = 'transparent' }
const hoverDanger = e => { e.currentTarget.style.color = 'var(--color-danger)' }
const unhoverDanger = e => { e.currentTarget.style.color = 'var(--text-muted)' }
const hoverRow = e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }
const unhoverRow = e => { e.currentTarget.style.background = 'transparent' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateHeader(d) {
  const date = new Date(d + 'T00:00:00')
  const wd = date.toLocaleDateString('en-US', { weekday: 'short' })
  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${wd} ${md}`
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function fmtMoney(v) {
  return `$${(Number(v) || 0).toFixed(2)}`
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <div onClick={() => onSort(field)}
      style={{ fontSize: 10, fontWeight: 700, color: active ? '#ffffff' : 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
    >
      {label}{active && <span style={{ fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </div>
  )
}

function EditableCell({ value, onSave, type = 'text', placeholder = '—', centered = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(value || '') }, [value])
  const handleSave = async () => { setEditing(false); if (val !== (value || '')) await onSave(val) }
  if (editing) {
    return (
      <input ref={inputRef} type={type}
        style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'var(--surface-card)', color: 'var(--text-primary)', caretColor: 'var(--color-info)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setVal(value || '') } }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 12, cursor: 'text', color: val ? 'var(--text-secondary)' : 'var(--text-muted)', minHeight: 18, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: centered ? 'center' : 'left' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'var(--border-default)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
    >
      {type === 'date' ? fmtDate(val) : type === 'time' ? fmtTime(val) : (val || placeholder)}
    </div>
  )
}

function Checkbox({ checked, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 16, height: 16, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
      background: checked ? 'rgba(26,86,219,0.12)' : 'transparent',
      border: checked ? '1px solid var(--color-info)' : '1px solid var(--border-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function StaffPicker({ onSelect, onClose, excludeIds = [] }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const fetch = async () => {
      const supabase = getSupabase()
      let query = supabase.from('staff').select('id, first_name, last_name').order('last_name', { ascending: true })
      if (search.trim()) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      const { data } = await query.limit(10)
      setResults((data || []).filter(s => !excludeIds.includes(s.id)))
    }
    fetch()
  }, [search])
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 380, maxHeight: 440, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Select Staff</div>
        <input ref={inputRef}
          style={SYSTEM_INPUT}
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map(s => (
            <div key={s.id} onClick={() => onSelect(s)}
              style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}
              onMouseEnter={hoverRow}
              onMouseLeave={unhoverRow}
            >
              {s.first_name} {s.last_name}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={CANCEL_BTN}
          onMouseEnter={hoverBlue}
          onMouseLeave={unhoverBlue}
        >Cancel</button>
      </div>
    </div>
  )
}

function WarningTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FF8C00" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 7V10" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="13" r="0.75" fill="#FF8C00"/>
    </svg>
  )
}

function TravelTypeDropdown({ value, onChange }) {
  const current = value || ''
  const style = current && TRAVEL_TYPE_STYLES[current]
    ? TRAVEL_TYPE_STYLES[current]
    : { label: 'N/A', bg: 'rgba(100,116,139,0.10)', color: 'var(--text-muted)', border: '0.5px solid var(--border-default)' }
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
        background: style.bg, color: style.color, border: style.border,
        userSelect: 'none', whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        {style.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 5, flexShrink: 0, opacity: 0.8 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <select
        value={current}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
      >
        <option value="">N/A</option>
        <option value="flight">Flight</option>
        <option value="train">Train</option>
        <option value="bus">Bus</option>
        <option value="driving">Driving</option>
      </select>
    </div>
  )
}

function TravelTable({ rows, onUpdate, onRemove, sortField, sortDir, onSort, type }) {
  const GRID = '1.4fr 0.8fr 0.8fr 1fr 0.9fr 0.7fr 1fr 1fr 24px'
  const CELL = { display: 'flex', alignItems: 'center', overflow: 'hidden' }

  return (
    <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 6px', background: '#1a56db', padding: '8px 12px' }}>
        <div style={CELL}><SortHeader label="Name" field="staff_name" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Travel Type" field="travel_type" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Date" field="travel_date" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Airline / Op" field="airline" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Flight / Route #" field="flight_number" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Time" field={type === 'arrival' ? 'arrival_time' : 'departure_time'} sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Airport / Station" field="airport" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL, justifyContent: 'center' }}><SortHeader label="Transport" field="transport" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div />
      </div>

      {rows.length === 0 && (
        <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
          No {type === 'arrival' ? 'arrivals' : 'departures'} yet. Confirm staff on the Staffing tab to auto-populate.
        </div>
      )}

      {rows.map(row => {
        const isBusOrDriving = row.travel_type === 'bus' || row.travel_type === 'driving'
        const showWarning = isBusOrDriving
          ? !row.travel_date
          : (!row.travel_date || !row.airline || !row.flight_number || !row.airport)
        return (
          <div key={row.id ?? `synthetic-${row.staff_id}`} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: '0.5px solid var(--border-default)', background: row.travel_type === 'driving' ? 'rgba(168,85,247,0.06)' : 'transparent', transition: 'background 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = row.travel_type === 'driving' ? 'rgba(168,85,247,0.10)' : 'var(--glass-tile-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = row.travel_type === 'driving' ? 'rgba(168,85,247,0.06)' : 'transparent' }}
          >
            <div style={{ ...CELL, gap: 6 }}>
              {showWarning && <WarningTriangle />}
              <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.staff_name || '—'}</span>
            </div>
            <div style={{ ...CELL, justifyContent: 'center' }}><TravelTypeDropdown value={row.travel_type} onChange={v => onUpdate(row, 'travel_type', v)} /></div>
            <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={row.travel_date} type="date" centered onSave={v => onUpdate(row, 'travel_date', v)} /></div>
            {row.travel_type === 'driving'
              ? <div style={{ ...CELL, justifyContent: 'center' }} />
              : <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={row.airline} onSave={v => onUpdate(row, 'airline', v)} placeholder={row.travel_type === 'train' ? 'Operator' : row.travel_type === 'bus' ? 'Operator' : 'Airline'} centered={true} /></div>
            }
            {row.travel_type === 'driving'
              ? <div style={{ ...CELL, justifyContent: 'center' }} />
              : <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={row.flight_number} onSave={v => onUpdate(row, 'flight_number', v)} placeholder={row.travel_type === 'train' ? 'Train #' : row.travel_type === 'bus' ? 'Route #' : 'Flight #'} centered={true} /></div>
            }
            {row.travel_type === 'driving'
              ? <div style={{ ...CELL, justifyContent: 'center' }} />
              : <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={type === 'arrival' ? row.arrival_time : row.departure_time} type="time" onSave={v => onUpdate(row, type === 'arrival' ? 'arrival_time' : 'departure_time', v)} centered /></div>
            }
            {row.travel_type === 'driving'
              ? <div style={{ ...CELL, justifyContent: 'center' }} />
              : <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={row.airport} onSave={v => onUpdate(row, 'airport', v)} placeholder={row.travel_type === 'train' ? 'Station' : row.travel_type === 'bus' ? 'Terminal / Stop' : 'Airport'} centered={true} /></div>
            }
            {row.travel_type === 'driving'
              ? <div style={{ ...CELL, justifyContent: 'center' }} />
              : <div style={{ ...CELL, justifyContent: 'center' }}><EditableCell value={row.transport} onSave={v => onUpdate(row, 'transport', v)} placeholder="Transport" centered /></div>
            }
            <div style={{ ...CELL, justifyContent: 'center' }}>
              <div onClick={() => onRemove(row.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
                onMouseEnter={hoverDanger}
                onMouseLeave={unhoverDanger}
              >×</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RateField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtMoney(value)}</div>
    </div>
  )
}

function FieldDivider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-default)' }} />
}

export default function TravelHotelTab({ eventId, event }) {
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [tour, setTour] = useState(null)
  const [confirmedStaff, setConfirmedStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [travelTab, setTravelTab] = useState('arrivals')
  const [arrivalSort, setArrivalSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [departureSort, setDepartureSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [roomStaffPicker, setRoomStaffPicker] = useState(null)
  const [editingHotel, setEditingHotel] = useState(false)
  const [hotelForm, setHotelForm] = useState({ hotel_name: '', address: '', check_in_date: '', check_out_date: '', notes: '' })
  const [selectedUnroomed, setSelectedUnroomed] = useState([])
  const [saveError, setSaveError] = useState(null)
  const [perDiemRates, setPerDiemRates] = useState(null)
  const [perDiemMeals, setPerDiemMeals] = useState([])
  const [perDiemStaff, setPerDiemStaff] = useState([])
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [showEligibleModal, setShowEligibleModal] = useState(false)
  const [ratesForm, setRatesForm] = useState({ breakfast_rate: '', lunch_rate: '', dinner_rate: '' })

  useEffect(() => { fetchAll() }, [eventId])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [arrRes, depRes, hotelRes, roomsRes, staffRes, tourRes] = await Promise.all([
      supabase.from('event_travel_arrivals').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_travel_departures').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_hotel').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_hotel_rooms').select('*, s1:staff_id_1(id, first_name, last_name), s2:staff_id_2(id, first_name, last_name)').eq('event_id', eventId),
      supabase.from('staff_assignments')
        .select(`
          staff_id,
          status,
          confirmed,
          staff:staff_id(id, first_name, last_name, display_name)
        `)
        .eq('event_id', eventId)
        .not('staff_id', 'is', null),
      event.tour_id ? supabase.from('tours').select('id, name, color').eq('id', event.tour_id).single() : Promise.resolve({ data: null }),
    ])
    const confirmedRows = (staffRes.data || []).filter(r => r.confirmed === true || r.status === 'confirmed')
    const confirmedStaffIds = new Set(confirmedRows.map(r => r.staff_id).filter(Boolean))

    const existingArrivalStaffIds = new Set((arrRes.data || []).map(r => r.staff_id))
    const missingArrivals = confirmedRows
      .filter(r => !existingArrivalStaffIds.has(r.staff_id))
      .map(r => ({
        id: null,
        event_id: eventId,
        staff_id: r.staff_id,
        staff: r.staff,
        travel_type: '',
        travel_date: null,
        airline: null,
        flight_number: null,
        arrival_time: null,
        airport: null,
        transport: null,
        flagged: true,
        _synthetic: true
      }))
    setArrivals([
      ...(arrRes.data || [])
        .filter(r => confirmedStaffIds.has(r.staff_id))
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })),
      ...missingArrivals
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null }))
    ])

    const existingDepartureStaffIds = new Set((depRes.data || []).map(r => r.staff_id))
    const missingDepartures = confirmedRows
      .filter(r => !existingDepartureStaffIds.has(r.staff_id))
      .map(r => ({
        id: null,
        event_id: eventId,
        staff_id: r.staff_id,
        staff: r.staff,
        travel_type: '',
        travel_date: null,
        airline: null,
        flight_number: null,
        departure_time: null,
        airport: null,
        transport: null,
        flagged: true,
        _synthetic: true
      }))
    setDepartures([
      ...(depRes.data || [])
        .filter(r => confirmedStaffIds.has(r.staff_id))
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })),
      ...missingDepartures
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null }))
    ])
    if (!hotelRes.error && hotelRes.data) {
      setHotel(hotelRes.data)
      setHotelForm({ hotel_name: hotelRes.data.hotel_name || '', address: hotelRes.data.address || '', check_in_date: hotelRes.data.check_in_date || '', check_out_date: hotelRes.data.check_out_date || '', notes: hotelRes.data.notes || '' })
    }
    setRooms(roomsRes.data || [])
    setConfirmedStaff(confirmedRows.map(r => r.staff).filter(Boolean))
    if (tourRes.data) setTour(tourRes.data)

    const [perDiemRatesRes, perDiemMealsRes, perDiemStaffRes] = await Promise.all([
      supabase.from('event_perdiem_rates').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_perdiem_meals').select('*').eq('event_id', eventId).order('meal_date', { ascending: true }),
      supabase.from('event_perdiem_staff').select('*, staff:staff_id(id, first_name, last_name)').eq('event_id', eventId),
    ])
    if (perDiemRatesRes.data) { setPerDiemRates(perDiemRatesRes.data); setRatesForm({ breakfast_rate: perDiemRatesRes.data.breakfast_rate, lunch_rate: perDiemRatesRes.data.lunch_rate, dinner_rate: perDiemRatesRes.data.dinner_rate }) }
    setPerDiemMeals(perDiemMealsRes.data || [])
    setPerDiemStaff(perDiemStaffRes.data || [])

    setLoading(false)
  }

  const sortRows = (rows, sort) => [...rows].sort((a, b) => {
    const av = a[sort.field] || ''
    const bv = b[sort.field] || ''
    if (sort.field === 'travel_date') {
      const aEmpty = !av
      const bEmpty = !bv
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1
      const primary = sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      if (primary !== 0) return primary
      const at = a.arrival_time || a.departure_time || ''
      const bt = b.arrival_time || b.departure_time || ''
      return at.localeCompare(bt)
    }
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const handleSort = (table, field) => {
    if (table === 'arrival') setArrivalSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    else setDepartureSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const handleUpdateArrival = async (row, field, value) => {
    const s = getSupabase()
    if (row.id == null) {
      const { data, error: insertError } = await s.from('event_travel_arrivals')
        .insert([{ event_id: eventId, staff_id: row.staff_id }])
        .select().single()
      if (insertError || !data) { console.error('Failed to create arrival:', insertError); setSaveError('Failed to save. Please try again.'); return }
      const { error } = await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', data.id)
      if (error) { console.error('Failed to update arrival:', error); setSaveError('Failed to save. Please try again.') }
    } else {
      const { error } = await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', row.id)
      if (error) { console.error('Failed to update arrival:', error); setSaveError('Failed to save. Please try again.') }
    }
    fetchAll()
  }
  const handleUpdateDeparture = async (row, field, value) => {
    const s = getSupabase()
    if (row.id == null) {
      const { data, error: insertError } = await s.from('event_travel_departures')
        .insert([{ event_id: eventId, staff_id: row.staff_id }])
        .select().single()
      if (insertError || !data) { console.error('Failed to create departure:', insertError); setSaveError('Failed to save. Please try again.'); return }
      const { error } = await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', data.id)
      if (error) { console.error('Failed to update departure:', error); setSaveError('Failed to save. Please try again.') }
    } else {
      const { error } = await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', row.id)
      if (error) { console.error('Failed to update departure:', error); setSaveError('Failed to save. Please try again.') }
    }
    fetchAll()
  }
  const handleRemoveArrival = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_arrivals').delete().eq('id', id)
    if (error) { console.error('Failed to remove arrival:', error); setSaveError('Failed to remove. Please try again.') }
    fetchAll()
  }
  const handleRemoveDeparture = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_departures').delete().eq('id', id)
    if (error) { console.error('Failed to remove departure:', error); setSaveError('Failed to remove. Please try again.') }
    fetchAll()
  }

  const handleSaveHotel = async () => {
    const s = getSupabase()
    const { error } = hotel
      ? await s.from('event_hotel').update(hotelForm).eq('id', hotel.id)
      : await s.from('event_hotel').insert([{ ...hotelForm, event_id: eventId }])
    if (error) { console.error('Failed to save hotel:', error); setSaveError('Failed to save hotel. Please try again.'); return }
    setEditingHotel(false)
    fetchAll()
  }

  const handleAddRoom = async () => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').insert([{ event_id: eventId, room_type: 'Double' }])
    if (error) { console.error('Failed to add room:', error); setSaveError('Failed to add room. Please try again.') }
    fetchAll()
  }
  const handleRemoveRoom = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').delete().eq('id', id)
    if (error) { console.error('Failed to remove room:', error); setSaveError('Failed to remove room. Please try again.') }
    fetchAll()
  }
  const handleUpdateRoom = async (id, field, value) => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').update({ [field]: value || null }).eq('id', id)
    if (error) { console.error('Failed to update room:', error); setSaveError('Failed to save. Please try again.') }
    fetchAll()
  }

  const handleAssignRoomStaff = async (staffMember) => {
    const { roomId, slot } = roomStaffPicker
    const supabase = getSupabase()
    const { error: e1 } = await supabase.from('event_hotel_rooms').update({ [slot]: staffMember.id }).eq('id', roomId)
    if (e1) {
      console.error('Failed to assign staff to room:', e1)
      setSaveError('Failed to assign staff. Please try again.')
      setRoomStaffPicker(null)
      fetchAll()
      return
    }
    setRoomStaffPicker(null)
    const arrival = arrivals.find(a => a.staff_id === staffMember.id)
    const departure = departures.find(d => d.staff_id === staffMember.id)
    const room = rooms.find(r => r.id === roomId)
    if (arrival?.travel_date || departure?.travel_date) {
      const updates = {}
      const otherStaffId = slot === 'staff_id_1' ? room?.staff_id_2 : room?.staff_id_1
      const otherArrival = arrivals.find(a => a.staff_id === otherStaffId)
      const dates = [arrival?.travel_date, otherArrival?.travel_date].filter(Boolean)
      if (dates.length > 0) updates.check_in_date = dates.sort()[0]
      const otherDeparture = departures.find(d => d.staff_id === otherStaffId)
      const depDates = [departure?.travel_date, otherDeparture?.travel_date].filter(Boolean)
      if (depDates.length > 0) updates.check_out_date = depDates.sort().reverse()[0]
      if (Object.keys(updates).length > 0) {
        const { error: e2 } = await supabase.from('event_hotel_rooms').update(updates).eq('id', roomId)
        if (e2) console.error('Failed to update room dates:', e2)
      }
    }
    fetchAll()
  }

  const roomedStaffIds = rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)
  const unroomedStaff = confirmedStaff.filter(s => !roomedStaffIds.includes(s.id))
  const handleAddSelectedToRooming = async () => {
    const supabase = getSupabase()
    const results = await Promise.all(selectedUnroomed.map(staffId =>
      supabase.from('event_hotel_rooms').insert([{ event_id: eventId, staff_id_1: staffId, room_type: 'Single' }])
    ))
    const failed = results.find(r => r.error)
    if (failed) { console.error('Failed to add to rooming:', failed.error); setSaveError('Failed to add staff to rooming. Please try again.') }
    setSelectedUnroomed([])
    fetchAll()
  }

  const getEventDates = () => {
    if (!event?.load_in_date || !event?.load_out_date) return []
    const dates = []
    const current = new Date(event.load_in_date + 'T00:00:00')
    const end = new Date(event.load_out_date + 'T00:00:00')
    while (current <= end) {
      const pad = n => String(n).padStart(2, '0')
      dates.push(`${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}`)
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  const formatStaffDays = (staffId) => {
    const arrival = arrivals.find(a => a.staff_id === staffId)
    const departure = departures.find(d => d.staff_id === staffId)
    const inDate = arrival?.travel_date
    const outDate = departure?.travel_date
    if (!inDate && !outDate) return '—'
    let nights = ''
    if (inDate && outDate) {
      const d1 = new Date(inDate + 'T00:00:00')
      const d2 = new Date(outDate + 'T00:00:00')
      const days = Math.round((d2 - d1) / 86400000) + 1
      nights = ` (${days} day${days === 1 ? '' : 's'})`
    }
    return `${fmtDate(inDate)} – ${fmtDate(outDate)}${nights}`
  }

  const handleSaveRates = async () => {
    const supabase = getSupabase()
    const data = { breakfast_rate: parseFloat(ratesForm.breakfast_rate) || 0, lunch_rate: parseFloat(ratesForm.lunch_rate) || 0, dinner_rate: parseFloat(ratesForm.dinner_rate) || 0, event_id: eventId }
    if (perDiemRates) {
      await supabase.from('event_perdiem_rates').update(data).eq('event_id', eventId)
    } else {
      await supabase.from('event_perdiem_rates').insert([data])
    }
    setShowRatesModal(false)
    fetchAll()
  }

  const handleToggleMeal = async (date, meal) => {
    const supabase = getSupabase()
    const existing = perDiemMeals.find(m => m.meal_date === date)
    if (existing) {
      await supabase.from('event_perdiem_meals').update({ [meal]: !existing[meal] }).eq('id', existing.id)
    } else {
      await supabase.from('event_perdiem_meals').insert([{ event_id: eventId, meal_date: date, [meal]: true }])
    }
    fetchAll()
  }

  const handleToggleExtraDay = async (perDiemStaffId, current) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').update({ extra_day: !current }).eq('id', perDiemStaffId)
    fetchAll()
  }

  const handleAddPerDiemStaff = async (staffId) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').insert([{ event_id: eventId, staff_id: staffId, extra_day: false }])
    fetchAll()
  }

  const handleRemovePerDiemStaff = async (perDiemStaffId) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').delete().eq('id', perDiemStaffId)
    fetchAll()
  }

  const calcStaffPerDiem = (staffEntry) => {
    if (!perDiemRates) return 0
    const { breakfast_rate, lunch_rate, dinner_rate } = perDiemRates
    const dailyMax = (breakfast_rate || 0) + (lunch_rate || 0) + (dinner_rate || 0)
    const eventDates = getEventDates()
    let total = 0
    for (const date of eventDates) {
      const meal = perDiemMeals.find(m => m.meal_date === date)
      let dayTotal = 0
      if (!meal?.breakfast_provided) dayTotal += (breakfast_rate || 0)
      if (!meal?.lunch_provided) dayTotal += (lunch_rate || 0)
      if (!meal?.dinner_provided) dayTotal += (dinner_rate || 0)
      total += dayTotal
    }
    if (staffEntry.extra_day) total += dailyMax
    return total
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  const ROOM_GRID = '1.2fr 1.2fr 0.8fr 0.7fr 0.7fr 1fr 24px'
  const eventDates = getEventDates()
  const dailyMax = perDiemRates ? (Number(perDiemRates.breakfast_rate) || 0) + (Number(perDiemRates.lunch_rate) || 0) + (Number(perDiemRates.dinner_rate) || 0) : 0
  const grandTotal = perDiemStaff.reduce((sum, s) => sum + calcStaffPerDiem(s), 0)
  const MEAL_TYPES = [
    { key: 'breakfast_provided', label: 'Breakfast', rate: perDiemRates?.breakfast_rate },
    { key: 'lunch_provided', label: 'Lunch', rate: perDiemRates?.lunch_rate },
    { key: 'dinner_provided', label: 'Dinner', rate: perDiemRates?.dinner_rate },
  ]

  const TABS = [
    { key: 'arrivals', label: `Arrivals (${arrivals.length})` },
    { key: 'departures', label: `Departures (${departures.length})` },
    { key: 'hotel', label: 'Hotel' },
    { key: 'perdiem', label: 'Per Diem' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {saveError && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{saveError}</p>}

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTravelTab(t.key)}
            style={travelTab === t.key
              ? { background: 'rgba(26,86,219,0.08)', color: 'var(--color-info)', fontWeight: 600, fontSize: 14, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }
              : { background: 'transparent', color: 'var(--text-secondary)', fontWeight: 400, fontSize: 14, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
          >{t.label}</button>
        ))}
      </div>

      {/* ARRIVALS */}
      {travelTab === 'arrivals' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={SECTION_LABEL}>Arrivals</span>
            <button
              onClick={() => setArrivalSort({ field: 'travel_date', dir: 'asc' })}
              style={ADD_BTN}
              onMouseEnter={hoverBlue}
              onMouseLeave={unhoverBlue}
            >Quick Sort</button>
          </div>
          <TravelTable rows={sortRows(arrivals, arrivalSort)} onUpdate={handleUpdateArrival} onRemove={handleRemoveArrival} sortField={arrivalSort.field} sortDir={arrivalSort.dir} onSort={(f) => handleSort('arrival', f)} type="arrival" />
        </div>
      )}

      {/* DEPARTURES */}
      {travelTab === 'departures' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={SECTION_LABEL}>Departures</span>
            <button
              onClick={() => setDepartureSort({ field: 'travel_date', dir: 'asc' })}
              style={ADD_BTN}
              onMouseEnter={hoverBlue}
              onMouseLeave={unhoverBlue}
            >Quick Sort</button>
          </div>
          <TravelTable rows={sortRows(departures, departureSort)} onUpdate={handleUpdateDeparture} onRemove={handleRemoveDeparture} sortField={departureSort.field} sortDir={departureSort.dir} onSort={(f) => handleSort('departure', f)} type="departure" />
        </div>
      )}

      {/* HOTEL */}
      {travelTab === 'hotel' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={SECTION_LABEL}>Hotel</span>
            {hotel && <button onClick={() => setEditingHotel(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Edit</button>}
          </div>

          {hotel ? (
            <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Hotel</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.hotel_name || '—'}</div></div>
              {hotel.address && <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Address</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.address}</div></div>}
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check In</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtDate(hotel.check_in_date)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check Out</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtDate(hotel.check_out_date)}</div></div>
              {hotel.notes && <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Notes</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.notes}</div></div>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No hotel added yet.</span>
              <button onClick={() => setEditingHotel(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Add Hotel</button>
            </div>
          )}

          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 6px', padding: '8px 12px', background: '#1a56db' }}>
              {['Guest 1', 'Guest 2', 'Type', 'Check In', 'Check Out', 'Notes', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>{h}</div>
              ))}
            </div>
            {rooms.length === 0 && <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No rooms added yet.</div>}
            {rooms.map(room => (
              <div key={room.id} style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 6px', padding: '7px 12px', alignItems: 'center', borderTop: '0.5px solid var(--border-default)', background: 'transparent', transition: 'background 0.12s' }}
                onMouseEnter={hoverRow}
                onMouseLeave={unhoverRow}
              >
                <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_1' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s1 ? 'var(--text-primary)' : 'var(--color-info)' }}>
                  {room.s1 ? `${room.s1.first_name} ${room.s1.last_name}` : '+ Assign'}
                </div>
                <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_2' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s2 ? 'var(--text-primary)' : 'var(--color-info)' }}>
                  {room.s2 ? `${room.s2.first_name} ${room.s2.last_name}` : '+ Assign'}
                </div>
                <select value={room.room_type || 'Double'} onChange={e => handleUpdateRoom(room.id, 'room_type', e.target.value)} style={SYSTEM_SELECT}>
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <EditableCell value={room.check_in_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_in_date', v)} />
                <EditableCell value={room.check_out_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_out_date', v)} />
                <EditableCell value={room.notes} onSave={v => handleUpdateRoom(room.id, 'notes', v)} placeholder="Notes" />
                <div onClick={() => handleRemoveRoom(room.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'right' }} onMouseEnter={hoverDanger} onMouseLeave={unhoverDanger}>×</div>
              </div>
            ))}
            <div style={{ padding: '8px 12px', borderTop: rooms.length > 0 ? '0.5px solid var(--border-default)' : 'none' }}>
              <span onClick={handleAddRoom} style={{ fontSize: 13, color: 'var(--color-info)', cursor: 'pointer' }}>+ Add room</span>
            </div>
          </div>

          {unroomedStaff.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                  Unroomed Staff ({unroomedStaff.length})
                </div>
                {selectedUnroomed.length > 0 && (
                  <button
                    onClick={handleAddSelectedToRooming}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    Add {selectedUnroomed.length} to Rooming List
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {unroomedStaff.map(s => {
                  const selected = selectedUnroomed.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedUnroomed(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                      style={{
                        ...GLASS,
                        padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: 8,
                        ...(selected ? { border: '0.5px solid var(--color-info)', background: 'rgba(26,86,219,0.10)' } : null),
                        transition: 'all 0.15s',
                      }}
                    >
                      <Checkbox checked={selected} onClick={() => {}} />
                      {s.first_name} {s.last_name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PER DIEM */}
      {travelTab === 'perdiem' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={SECTION_LABEL}>Per Diem</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowEligibleModal(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Eligible Staff</button>
              <button onClick={() => setShowRatesModal(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Set Rates</button>
            </div>
          </div>

          {!perDiemRates ? (
            <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Set meal rates to get started.</div>
              <button onClick={() => setShowRatesModal(true)} style={{ ...ADD_BTN, margin: '0 auto' }} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Set Rates</button>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                <RateField label="Breakfast" value={perDiemRates.breakfast_rate} />
                <FieldDivider />
                <RateField label="Lunch" value={perDiemRates.lunch_rate} />
                <FieldDivider />
                <RateField label="Dinner" value={perDiemRates.dinner_rate} />
                <FieldDivider />
                <RateField label="Daily Max" value={dailyMax} />
                <FieldDivider />
                <RateField label="Grand Total" value={grandTotal} />
              </div>

              {eventDates.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No event dates available.</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Meals provided by production — checked meals are deducted from per diem</div>
                  <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${eventDates.length}, 1fr)`, gap: '0 6px', padding: '8px 12px', background: '#1a56db' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>Meal</div>
                      {eventDates.map(d => (
                        <div key={d} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>{fmtDateHeader(d)}</div>
                      ))}
                    </div>
                    {MEAL_TYPES.map(meal => (
                      <div key={meal.key} style={{ display: 'grid', gridTemplateColumns: `140px repeat(${eventDates.length}, 1fr)`, gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: '0.5px solid var(--border-default)' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{meal.label} · {fmtMoney(meal.rate)}</div>
                        {eventDates.map(d => {
                          const m = perDiemMeals.find(pm => pm.meal_date === d)
                          return (
                            <Checkbox key={d} checked={!!m?.[meal.key]} onClick={() => handleToggleMeal(d, meal.key)} />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 60px 80px', gap: '0 6px', padding: '8px 12px', background: '#1a56db' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>Name</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>Days on site</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)' }}>+1 Day</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)', textAlign: 'right' }}>Total</div>
                </div>
                {perDiemStaff.length === 0 && <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No eligible staff yet.</div>}
                {perDiemStaff.map(entry => (
                  <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 60px 80px', gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: '0.5px solid var(--border-default)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{entry.staff ? `${entry.staff.first_name} ${entry.staff.last_name}` : '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatStaffDays(entry.staff_id)}</div>
                    <Checkbox checked={!!entry.extra_day} onClick={() => handleToggleExtraDay(entry.id, entry.extra_day)} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{fmtMoney(calcStaffPerDiem(entry))}</div>
                  </div>
                ))}
                <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--border-default)', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Grand total: {fmtMoney(grandTotal)}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <span onClick={() => setShowEligibleModal(true)} style={{ fontSize: 13, color: 'var(--color-info)', cursor: 'pointer' }}>+ Add staff</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* HOTEL EDIT MODAL */}
      {editingHotel && (
        <div style={OVERLAY} onClick={() => setEditingHotel(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 28, width: 500, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{hotel ? 'Edit Hotel' : 'Add Hotel'}</div>
            {[{ label: 'Hotel Name', key: 'hotel_name', type: 'text' }, { label: 'Address', key: 'address', type: 'text' }, { label: 'Check In', key: 'check_in_date', type: 'date' }, { label: 'Check Out', key: 'check_out_date', type: 'date' }, { label: 'Notes', key: 'notes', type: 'text' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} style={SYSTEM_INPUT} value={hotelForm[f.key]} onChange={e => setHotelForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingHotel(false)}
                style={CANCEL_BTN}
                onMouseEnter={hoverBlue}
                onMouseLeave={unhoverBlue}
              >Cancel</button>
              <button className="btn-primary" onClick={handleSaveHotel}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SET RATES MODAL */}
      {showRatesModal && (
        <div style={OVERLAY} onClick={() => setShowRatesModal(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 360, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Set Meal Rates</div>
            {[{ label: 'Breakfast Rate', key: 'breakfast_rate' }, { label: 'Lunch Rate', key: 'lunch_rate' }, { label: 'Dinner Rate', key: 'dinner_rate' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type="number" step="0.01" style={SYSTEM_INPUT} value={ratesForm[f.key]} onChange={e => setRatesForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRatesModal(false)}
                style={CANCEL_BTN}
                onMouseEnter={hoverBlue}
                onMouseLeave={unhoverBlue}
              >Cancel</button>
              <button onClick={handleSaveRates} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--color-info)', color: '#ffffff', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ELIGIBLE STAFF MODAL */}
      {showEligibleModal && (
        <div style={OVERLAY} onClick={() => setShowEligibleModal(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 400, maxHeight: 480, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Per Diem Eligible Staff</div>
              <div onClick={() => setShowEligibleModal(false)} style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}>×</div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {confirmedStaff.map(s => {
                const entry = perDiemStaff.find(p => p.staff_id === s.id)
                const checked = !!entry
                return (
                  <div key={s.id}
                    onClick={() => checked ? handleRemovePerDiemStaff(entry.id) : handleAddPerDiemStaff(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer' }}
                    onMouseEnter={hoverRow}
                    onMouseLeave={unhoverRow}
                  >
                    <Checkbox checked={checked} onClick={() => {}} />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.first_name} {s.last_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {roomStaffPicker && <StaffPicker onSelect={handleAssignRoomStaff} onClose={() => setRoomStaffPicker(null)} excludeIds={roomedStaffIds} />}
    </div>
  )
}
