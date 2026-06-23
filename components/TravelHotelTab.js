'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'
import { createPDF } from '../lib/generatePDF'

const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Twin']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <div onClick={() => onSort(field)}
      style={{ fontSize: 10.5, color: active ? '#f1f5f9' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
    >
      {label}{active && <span style={{ fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
    </div>
  )
}

function EditableCell({ value, onSave, type = 'text', placeholder = '—' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(value || '') }, [value])
  const handleSave = async () => { setEditing(false); if (val !== (value || '')) await onSave(val) }
  if (editing) {
    return (
      <input ref={inputRef} type={type}
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '0.5px solid #33FF99', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', caretColor: '#33FF99', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setVal(value || '') } }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 13, cursor: 'text', color: val ? '#f1f5f9' : 'transparent', minHeight: 20, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.20)'; if (!val) e.currentTarget.style.color = '#64748b' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; if (!val) e.currentTarget.style.color = 'transparent' }}
    >
      {type === 'date' ? fmtDate(val) : type === 'time' ? fmtTime(val) : (val || placeholder)}
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 24, width: 380, maxHeight: 440, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Select Staff</div>
        <input ref={inputRef}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', caretColor: '#ffffff', outline: 'none', width: '100%' }}
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map(s => (
            <div key={s.id} onClick={() => onSelect(s)}
              style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.first_name} {s.last_name}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >Cancel</button>
      </div>
    </div>
  )
}

function WarningTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFD60A" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 7V10" stroke="#FFD60A" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="13" r="0.75" fill="#FFD60A"/>
    </svg>
  )
}

function TravelTypeDropdown({ value, onChange }) {
  return (
    <select
      value={value || 'flight'}
      onChange={e => onChange(e.target.value)}
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: '#0d1f3a', color: '#f1f5f9', outline: 'none', cursor: 'pointer', width: '100%' }}>
      <option value="flight">Flight</option>
      <option value="train">Train</option>
      <option value="bus">Bus</option>
      <option value="driving">Driving</option>
    </select>
  )
}

function TravelTable({ rows, onUpdate, onRemove, sortField, sortDir, onSort, type }) {
  // Name 180 | Travel Type 140 | Date 130 | Airline/Op 180 | Flight# 140 | Time 110 | Airport 180 | Transport 160 | × 36
  const GRID = '180px 140px 130px 180px 140px 110px 180px 160px 36px'
  const HDR = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }
  const CELL = { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box', overflow: 'hidden' }

  return (
    <div style={{ border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, background: '#0d1f3a', borderBottom: '0.5px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ ...CELL, padding: '0 20px' }}><SortHeader label="Name" field="staff_name" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL }}><div style={HDR}>Travel Type</div></div>
        <div style={{ ...CELL }}><SortHeader label="Date" field="travel_date" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL }}><div style={HDR}>Airline / Operator</div></div>
        <div style={{ ...CELL }}><div style={HDR}>Flight # / Train #</div></div>
        <div style={{ ...CELL }}><SortHeader label="Time" field={type === 'arrival' ? 'arrival_time' : 'departure_time'} sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div style={{ ...CELL }}><div style={HDR}>Airport / Station</div></div>
        <div style={{ ...CELL }}><SortHeader label="Transport" field="transport" sortField={sortField} sortDir={sortDir} onSort={onSort} /></div>
        <div />
      </div>

      {rows.length === 0 && (
        <div style={{ padding: '20px 16px', fontSize: 13, color: '#64748b' }}>
          No {type === 'arrival' ? 'arrivals' : 'departures'} yet. Confirm staff on the Staffing tab to auto-populate.
        </div>
      )}

      {rows.map((row, idx) => {
        const isBusOrDriving = row.travel_type === 'bus' || row.travel_type === 'driving'
        const showWarning = isBusOrDriving
          ? !row.travel_date
          : (!row.travel_date || !row.airline || !row.flight_number || !row.airport)
        return (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: idx < rows.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', background: 'transparent', transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ ...CELL, padding: '0 20px', gap: 8, flexShrink: 0 }}>
              {showWarning && <WarningTriangle />}
              <span style={{ fontSize: 13, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.staff_name || '—'}</span>
            </div>
            <div style={CELL}><TravelTypeDropdown value={row.travel_type} onChange={v => onUpdate(row.id, 'travel_type', v)} /></div>
            <div style={CELL}><EditableCell value={row.travel_date} type="date" onSave={v => onUpdate(row.id, 'travel_date', v)} /></div>
            <div style={CELL}><EditableCell value={row.airline} onSave={v => onUpdate(row.id, 'airline', v)} placeholder={row.travel_type === 'train' ? 'Operator' : 'Airline'} /></div>
            <div style={CELL}><EditableCell value={row.flight_number} onSave={v => onUpdate(row.id, 'flight_number', v)} placeholder={row.travel_type === 'train' ? 'Train #' : 'Flight #'} /></div>
            <div style={CELL}><EditableCell value={type === 'arrival' ? row.arrival_time : row.departure_time} type="time" onSave={v => onUpdate(row.id, type === 'arrival' ? 'arrival_time' : 'departure_time', v)} /></div>
            <div style={CELL}><EditableCell value={row.airport} onSave={v => onUpdate(row.id, 'airport', v)} placeholder={row.travel_type === 'train' ? 'Station' : 'Airport'} /></div>
            <div style={CELL}><EditableCell value={row.transport} onSave={v => onUpdate(row.id, 'transport', v)} placeholder="Transport" /></div>
            <div style={{ ...CELL, justifyContent: 'center', padding: 0 }}>
              <div onClick={() => onRemove(row.id)} style={{ fontSize: 18, color: '#64748b', cursor: 'pointer', opacity: 0.4, lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#e05252'; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.opacity = '0.4' }}
              >×</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TravelHotelTab({ eventId, event }) {
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [tour, setTour] = useState(null)
  const [confirmedStaff, setConfirmedStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [arrivalSort, setArrivalSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [departureSort, setDepartureSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [addingArrival, setAddingArrival] = useState(false)
  const [addingDeparture, setAddingDeparture] = useState(false)
  const [roomStaffPicker, setRoomStaffPicker] = useState(null)
  const [editingHotel, setEditingHotel] = useState(false)
  const [hotelForm, setHotelForm] = useState({ hotel_name: '', address: '', check_in_date: '', check_out_date: '', notes: '' })
  const [arrivalsOpen, setArrivalsOpen] = useState(true)
  const [departuresOpen, setDeparturesOpen] = useState(true)
  const [hotelOpen, setHotelOpen] = useState(true)
  const [selectedUnroomed, setSelectedUnroomed] = useState([])
  const [saveError, setSaveError] = useState(null)

  useEffect(() => { fetchAll() }, [eventId])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [arrRes, depRes, hotelRes, roomsRes, staffRes, tourRes] = await Promise.all([
      supabase.from('event_travel_arrivals').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_travel_departures').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_hotel').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_hotel_rooms').select('*, s1:staff_id_1(id, first_name, last_name), s2:staff_id_2(id, first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_staff').select('staff_id, staff(id, first_name, last_name)').eq('event_id', eventId).eq('confirmed', true),
      event.tour_id ? supabase.from('tours').select('id, name, color').eq('id', event.tour_id).single() : Promise.resolve({ data: null }),
    ])
    const confirmedStaffIds = new Set((staffRes.data || []).map(s => s.staff_id).filter(Boolean))
    setArrivals((arrRes.data || [])
      .filter(r => confirmedStaffIds.has(r.staff_id))
      .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })))
    setDepartures((depRes.data || [])
      .filter(r => confirmedStaffIds.has(r.staff_id))
      .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })))
    if (!hotelRes.error && hotelRes.data) {
      setHotel(hotelRes.data)
      setHotelForm({ hotel_name: hotelRes.data.hotel_name || '', address: hotelRes.data.address || '', check_in_date: hotelRes.data.check_in_date || '', check_out_date: hotelRes.data.check_out_date || '', notes: hotelRes.data.notes || '' })
    }
    setRooms(roomsRes.data || [])
    setConfirmedStaff((staffRes.data || []).map(s => s.staff).filter(Boolean))
    if (tourRes.data) setTour(tourRes.data)
    setLoading(false)
  }

  const sortRows = (rows, sort) => [...rows].sort((a, b) => {
    const av = a[sort.field] || ''; const bv = b[sort.field] || ''
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const handleSort = (table, field) => {
    if (table === 'arrival') setArrivalSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
    else setDepartureSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const handleUpdateArrival = async (id, field, value) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', id)
    if (error) { console.error('Failed to update arrival:', error); setSaveError('Failed to save. Please try again.') }
    fetchAll()
  }
  const handleUpdateDeparture = async (id, field, value) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', id)
    if (error) { console.error('Failed to update departure:', error); setSaveError('Failed to save. Please try again.') }
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

  const handleAddArrival = async (staffMember) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: staffMember.id }])
    if (error) { console.error('Failed to add arrival:', error); setSaveError('Failed to add. Please try again.') }
    setAddingArrival(false)
    fetchAll()
  }
  const handleAddDeparture = async (staffMember) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_departures').insert([{ event_id: eventId, staff_id: staffMember.id }])
    if (error) { console.error('Failed to add departure:', error); setSaveError('Failed to add. Please try again.') }
    setAddingDeparture(false)
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

  const handleExportArrivalsPDF = () => {
    const columns = ['Name', 'Travel Type', 'Date',
      'Airline/Operator', 'Flight #', 'Time',
      'Airport/Station', 'Transport']
    const rows = arrivals.map(a => [
      a.staff_name || '—',
      a.travel_type || 'Flight',
      a.travel_date || '—',
      a.airline || '—',
      a.flight_number || '—',
      a.arrival_time || '—',
      a.airport || '—',
      a.transport || '—',
    ])
    const doc = createPDF({
      title: `${event.city}, ${event.country} — Arrivals`,
      subtitle: `${tour?.name || ''} · Load-In ${event.load_in_date || ''}`,
      tourColor: tour?.color,
      columns,
      rows,
    })
    doc.save(`${event.city}-Arrivals.pdf`)
  }

  const handleExportDeparturesPDF = () => {
    const columns = ['Name', 'Travel Type', 'Date',
      'Airline/Operator', 'Flight #', 'Time',
      'Airport/Station', 'Transport']
    const rows = departures.map(d => [
      d.staff_name || '—',
      d.travel_type || 'Flight',
      d.travel_date || '—',
      d.airline || '—',
      d.flight_number || '—',
      d.departure_time || '—',
      d.airport || '—',
      d.transport || '—',
    ])
    const doc = createPDF({
      title: `${event.city}, ${event.country} — Departures`,
      subtitle: `${tour?.name || ''} · Load-In ${event.load_in_date || ''}`,
      tourColor: tour?.color,
      columns,
      rows,
    })
    doc.save(`${event.city}-Departures.pdf`)
  }

  const handleExportRoomingPDF = () => {
    const columns = ['Name 1', 'Name 2', 'Room Type', 'Check In', 'Check Out']
    const rows = rooms.map(r => [
      r.s1 ? `${r.s1.first_name} ${r.s1.last_name}` : '—',
      r.s2 ? `${r.s2.first_name} ${r.s2.last_name}` : '—',
      r.room_type || '—',
      r.check_in_date || '—',
      r.check_out_date || '—',
    ])
    const doc = createPDF({
      title: `${event.city}, ${event.country} — Hotel Rooming`,
      subtitle: `${hotel?.hotel_name || ''} · ${tour?.name || ''}`,
      tourColor: tour?.color,
      columns,
      rows,
    })
    doc.save(`${event.city}-Hotel-Rooming.pdf`)
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

  const sectionHeader = (label, count, isOpen, onToggle, onAdd, onExport) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? 12 : 0, cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isOpen ? '▾' : '▸'}</span>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</span>
        {count !== null && <span style={{ fontSize: 11, color: '#64748b' }}>({count})</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
        {onAdd && <button onClick={onAdd} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}>+ Add</button>}
        {onExport && (
          <button
            onClick={onExport}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Export PDF</button>
        )}
      </div>
    </div>
  )

  if (loading) return <div style={{ fontSize: 14, color: '#94a3b8' }}>Loading...</div>

  const ROOM_GRID = '180px 180px 110px 100px 100px 1fr 36px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {saveError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 4px' }}>{saveError}</p>}

      {/* ARRIVALS */}
      <div>
        {sectionHeader('Arrivals', arrivals.length, arrivalsOpen, () => setArrivalsOpen(p => !p), () => setAddingArrival(true), handleExportArrivalsPDF)}
        {arrivalsOpen && (
          <TravelTable rows={sortRows(arrivals, arrivalSort)} onUpdate={handleUpdateArrival} onRemove={handleRemoveArrival} sortField={arrivalSort.field} sortDir={arrivalSort.dir} onSort={(f) => handleSort('arrival', f)} type="arrival" />
        )}
      </div>

      {/* DEPARTURES */}
      <div>
        {sectionHeader('Departures', departures.length, departuresOpen, () => setDeparturesOpen(p => !p), () => setAddingDeparture(true), handleExportDeparturesPDF)}
        {departuresOpen && (
          <TravelTable rows={sortRows(departures, departureSort)} onUpdate={handleUpdateDeparture} onRemove={handleRemoveDeparture} sortField={departureSort.field} sortDir={departureSort.dir} onSort={(f) => handleSort('departure', f)} type="departure" />
        )}
      </div>

      {/* HOTEL */}
      <div>
        {sectionHeader('Hotel', null, hotelOpen, () => setHotelOpen(p => !p), () => setEditingHotel(true), handleExportRoomingPDF)}
        {hotelOpen && (
          <>
            {hotel && (
              <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Hotel</div><div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{hotel.hotel_name || '—'}</div></div>
                {hotel.address && <div><div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Address</div><div style={{ fontSize: 14, color: '#f1f5f9' }}>{hotel.address}</div></div>}
                <div><div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check In</div><div style={{ fontSize: 14, color: '#f1f5f9' }}>{fmtDate(hotel.check_in_date)}</div></div>
                <div><div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check Out</div><div style={{ fontSize: 14, color: '#f1f5f9' }}>{fmtDate(hotel.check_out_date)}</div></div>
                {hotel.notes && <div><div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Notes</div><div style={{ fontSize: 14, color: '#f1f5f9' }}>{hotel.notes}</div></div>}
                <div style={{ marginLeft: 'auto' }}>
                  <button
                    onClick={() => setEditingHotel(true)}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >Edit</button>
                </div>
              </div>
            )}

            {!hotel && (
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>No hotel added yet.</div>
            )}

            <div style={{ border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 12px', padding: '10px 14px', background: '#0d1f3a', borderBottom: '0.5px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                {['Name 1', 'Name 2', 'Room Type', 'Check In', 'Check Out', 'Notes', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {rooms.length === 0 && <div style={{ padding: '16px 14px', fontSize: 13, color: '#64748b' }}>No rooms added yet.</div>}
              {rooms.map((room, i) => (
                <div key={room.id} style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 12px', padding: '10px 14px', alignItems: 'center', borderBottom: i < rooms.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', background: 'transparent', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_1' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s1 ? '#f1f5f9' : '#33FF99' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {room.s1 ? `${room.s1.first_name} ${room.s1.last_name}` : '+ Assign'}
                  </div>
                  <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_2' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s2 ? '#f1f5f9' : '#64748b' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {room.s2 ? `${room.s2.first_name} ${room.s2.last_name}` : '+ Assign'}
                  </div>
                  <select value={room.room_type || 'Double'} onChange={e => handleUpdateRoom(room.id, 'room_type', e.target.value)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', outline: 'none', cursor: 'pointer', width: '100%' }}>
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <EditableCell value={room.check_in_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_in_date', v)} />
                  <EditableCell value={room.check_out_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_out_date', v)} />
                  <EditableCell value={room.notes} onSave={v => handleUpdateRoom(room.id, 'notes', v)} placeholder="Notes" />
                  <div onClick={() => handleRemoveRoom(room.id)} style={{ fontSize: 16, color: '#64748b', cursor: 'pointer', opacity: 0.4, textAlign: 'right' }} onMouseEnter={e => { e.currentTarget.style.color = '#e05252'; e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.opacity = '0.4' }}>×</div>
                </div>
              ))}
              <div style={{ padding: '10px 14px', borderTop: rooms.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <span onClick={handleAddRoom} style={{ fontSize: 13, fontWeight: 600, color: '#33FF99', cursor: 'pointer' }}>+ Add Room</span>
              </div>
            </div>

            {unroomedStaff.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
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
                        className="glass-card"
                        style={{
                          padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#f1f5f9',
                          display: 'flex', alignItems: 'center', gap: 8,
                          border: selected ? '1px solid rgba(51,255,153,0.50)' : undefined,
                          background: selected ? 'rgba(51,255,153,0.12)' : undefined,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                          background: selected ? '#33FF99' : 'transparent',
                          border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.20)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && (
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        {s.first_name} {s.last_name}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* HOTEL EDIT MODAL */}
      {editingHotel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditingHotel(false)}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 28, width: 500, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{hotel ? 'Edit Hotel' : 'Add Hotel'}</div>
            {[{ label: 'Hotel Name', key: 'hotel_name', type: 'text' }, { label: 'Address', key: 'address', type: 'text' }, { label: 'Check In', key: 'check_in_date', type: 'date' }, { label: 'Check Out', key: 'check_out_date', type: 'date' }, { label: 'Notes', key: 'notes', type: 'text' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', caretColor: '#ffffff', outline: 'none', width: '100%' }} value={hotelForm[f.key]} onChange={e => setHotelForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingHotel(false)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button className="btn-primary" onClick={handleSaveHotel}>Save</button>
            </div>
          </div>
        </div>
      )}

      {addingArrival && <StaffPicker onSelect={handleAddArrival} onClose={() => setAddingArrival(false)} />}
      {addingDeparture && <StaffPicker onSelect={handleAddDeparture} onClose={() => setAddingDeparture(false)} />}
      {roomStaffPicker && <StaffPicker onSelect={handleAssignRoomStaff} onClose={() => setRoomStaffPicker(null)} excludeIds={roomedStaffIds} />}
    </div>
  )
}