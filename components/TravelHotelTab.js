'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

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
      style={{ fontSize: 10.5, color: active ? 'var(--mint)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
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
        style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setVal(value || '') } }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 13, cursor: 'text', color: val ? 'var(--text-secondary)' : 'transparent', minHeight: 20, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.15)'; if (!val) e.currentTarget.style.color = 'var(--text-muted)' }}
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
          style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
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
        <button onClick={onClose} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function TravelTable({ title, rows, onUpdate, onRemove, onAdd, sortField, sortDir, onSort, type }) {
  // Removed notes column — grid is now: name | date | flight | time | transport | remove
  const GRID = '1fr 100px 110px 100px 120px 160px 36px'

  const grouped = {}
  rows.forEach(r => {
    const key = r.transport || '__none__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  const handleExportPDF = () => {
    const win = window.open('', '_blank')
    const tableRows = rows.map(r => `
      <tr>
        <td>${r.staff_name || '—'}</td>
        <td>${fmtDate(r.travel_date)}</td>
        <td>${r.flight_number || '—'}</td>
        <td>${type === 'arrival' ? fmtTime(r.arrival_time) : fmtTime(r.departure_time)}</td>
        <td>${r.transport || '—'}</td>
      </tr>
    `).join('')
    win.document.write(`
      <html><head><title>${title}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body>
      <h2>${title}</h2>
      <table><thead><tr><th>Name</th><th>Date</th><th>Flight #</th><th>Time</th><th>Transport</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAdd} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}>+ Add</button>
          <button onClick={handleExportPDF} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Export PDF</button>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'visible' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 10px', padding: '8px 14px', borderBottom: '0.5px solid var(--glass-border)' }}>
          <SortHeader label="Name" field="staff_name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortHeader label="Date" field="travel_date" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortHeader label="Flight #" field="flight_number" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortHeader label="Time" field={type === 'arrival' ? 'arrival_time' : 'departure_time'} sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortHeader label="Airport" field="airport" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <SortHeader label="Transport" field="transport" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          <div />
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
            No {type === 'arrival' ? 'arrivals' : 'departures'} yet. Confirm staff on the Staffing tab to auto-populate.
          </div>
        )}

        {Object.entries(grouped).map(([group, groupRows]) => (
          <div key={group}>
            {group !== '__none__' && groupRows.length > 1 && (
              <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid var(--glass-border)', fontSize: 11, color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {group}
              </div>
            )}
            {groupRows.map((row) => (
              <div key={row.id} style={{
                display: 'grid', gridTemplateColumns: GRID, gap: '0 10px',
                padding: '10px 14px', alignItems: 'center',
                borderBottom: '0.5px solid var(--glass-border)',
                background: row.flagged ? 'rgba(255,51,51,0.05)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.flagged && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} title="Staff no longer confirmed" />}
                  <span style={{ fontSize: 13, color: row.flagged ? 'var(--red)' : 'var(--text-primary)' }}>{row.staff_name || '—'}</span>
                </div>
                <EditableCell value={row.travel_date} type="date" onSave={v => onUpdate(row.id, 'travel_date', v)} />
                <EditableCell value={row.flight_number} onSave={v => onUpdate(row.id, 'flight_number', v)} placeholder="Flight #" />
                <EditableCell value={type === 'arrival' ? row.arrival_time : row.departure_time} type="time" onSave={v => onUpdate(row.id, type === 'arrival' ? 'arrival_time' : 'departure_time', v)} />
                <EditableCell value={row.airport} onSave={v => onUpdate(row.id, 'airport', v)} placeholder="Airport" />
                <EditableCell value={row.transport} onSave={v => onUpdate(row.id, 'transport', v)} placeholder="Transport" />
                <div onClick={() => onRemove(row.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.4, textAlign: 'right' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0.4' }}
                >×</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TravelHotelTab({ eventId, event }) {
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [confirmedStaff, setConfirmedStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [arrivalSort, setArrivalSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [departureSort, setDepartureSort] = useState({ field: 'travel_date', dir: 'asc' })
  const [addingArrival, setAddingArrival] = useState(false)
  const [addingDeparture, setAddingDeparture] = useState(false)
  const [roomStaffPicker, setRoomStaffPicker] = useState(null)
  const [editingHotel, setEditingHotel] = useState(false)
  const [hotelForm, setHotelForm] = useState({ hotel_name: '', address: '', check_in_date: '', check_out_date: '', notes: '' })

  useEffect(() => { fetchAll() }, [eventId])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [arrRes, depRes, hotelRes, roomsRes, staffRes] = await Promise.all([
      supabase.from('event_travel_arrivals').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_travel_departures').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_hotel').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_hotel_rooms').select('*, s1:staff_id_1(id, first_name, last_name), s2:staff_id_2(id, first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_staff').select('staff_id, staff(id, first_name, last_name)').eq('event_id', eventId).eq('confirmed', true),
    ])
    setArrivals((arrRes.data || []).map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })))
    setDepartures((depRes.data || []).map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })))
    if (!hotelRes.error && hotelRes.data) {
      setHotel(hotelRes.data)
      setHotelForm({ hotel_name: hotelRes.data.hotel_name || '', address: hotelRes.data.address || '', check_in_date: hotelRes.data.check_in_date || '', check_out_date: hotelRes.data.check_out_date || '', notes: hotelRes.data.notes || '' })
    }
    setRooms(roomsRes.data || [])
    setConfirmedStaff((staffRes.data || []).map(s => s.staff).filter(Boolean))
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

  const handleUpdateArrival = async (id, field, value) => { const s = getSupabase(); await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', id); fetchAll() }
  const handleUpdateDeparture = async (id, field, value) => { const s = getSupabase(); await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', id); fetchAll() }
  const handleRemoveArrival = async (id) => { const s = getSupabase(); await s.from('event_travel_arrivals').delete().eq('id', id); fetchAll() }
  const handleRemoveDeparture = async (id) => { const s = getSupabase(); await s.from('event_travel_departures').delete().eq('id', id); fetchAll() }

  const handleAddArrival = async (staffMember) => {
    const s = getSupabase()
    await s.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: staffMember.id }])
    setAddingArrival(false); fetchAll()
  }
  const handleAddDeparture = async (staffMember) => {
    const s = getSupabase()
    await s.from('event_travel_departures').insert([{ event_id: eventId, staff_id: staffMember.id }])
    setAddingDeparture(false); fetchAll()
  }

  const handleSaveHotel = async () => {
    const s = getSupabase()
    if (hotel) await s.from('event_hotel').update(hotelForm).eq('id', hotel.id)
    else await s.from('event_hotel').insert([{ ...hotelForm, event_id: eventId }])
    setEditingHotel(false); fetchAll()
  }

  const handleAddRoom = async () => { const s = getSupabase(); await s.from('event_hotel_rooms').insert([{ event_id: eventId, room_type: 'Double' }]); fetchAll() }
  const handleRemoveRoom = async (id) => { const s = getSupabase(); await s.from('event_hotel_rooms').delete().eq('id', id); fetchAll() }
  const handleUpdateRoom = async (id, field, value) => { const s = getSupabase(); await s.from('event_hotel_rooms').update({ [field]: value || null }).eq('id', id); fetchAll() }

  const handleAssignRoomStaff = async (staffMember) => {
    const { roomId, slot } = roomStaffPicker
    const supabase = getSupabase()
    await supabase.from('event_hotel_rooms').update({ [slot]: staffMember.id }).eq('id', roomId)
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
      if (Object.keys(updates).length > 0) await supabase.from('event_hotel_rooms').update(updates).eq('id', roomId)
    }
    fetchAll()
  }

  const roomedStaffIds = rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)
  const unroomedStaff = confirmedStaff.filter(s => !roomedStaffIds.includes(s.id))

  const handleExportRoomingPDF = () => {
    const win = window.open('', '_blank')
    const tableRows = rooms.map(r => `<tr><td>${r.s1 ? `${r.s1.first_name} ${r.s1.last_name}` : '—'}</td><td>${r.s2 ? `${r.s2.first_name} ${r.s2.last_name}` : '—'}</td><td>${r.room_type || '—'}</td><td>${fmtDate(r.check_in_date)}</td><td>${fmtDate(r.check_out_date)}</td><td>${r.notes || '—'}</td></tr>`).join('')
    win.document.write(`<html><head><title>Rooming List</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Rooming List</h1>${hotel ? `<h3>${hotel.hotel_name || ''} · ${hotel.address || ''}</h3>` : ''}<table><thead><tr><th>Name 1</th><th>Name 2</th><th>Room Type</th><th>Check In</th><th>Check Out</th><th>Notes</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`)
    win.document.close(); win.print()
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  const ROOM_GRID = '180px 180px 110px 100px 100px 1fr 36px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <TravelTable title="Arrivals" rows={sortRows(arrivals, arrivalSort)} onUpdate={handleUpdateArrival} onRemove={handleRemoveArrival} onAdd={() => setAddingArrival(true)} sortField={arrivalSort.field} sortDir={arrivalSort.dir} onSort={(f) => handleSort('arrival', f)} type="arrival" />
        <TravelTable title="Departures" rows={sortRows(departures, departureSort)} onUpdate={handleUpdateDeparture} onRemove={handleRemoveDeparture} onAdd={() => setAddingDeparture(true)} sortField={departureSort.field} sortDir={departureSort.dir} onSort={(f) => handleSort('departure', f)} type="departure" />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Hotel</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditingHotel(true)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>{hotel ? 'Edit Hotel' : '+ Add Hotel'}</button>
            <button onClick={handleExportRoomingPDF} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Export PDF</button>
          </div>
        </div>

        {hotel && (
          <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Hotel</div><div style={{ fontSize: 14, fontWeight: 500 }}>{hotel.hotel_name || '—'}</div></div>
            {hotel.address && <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Address</div><div style={{ fontSize: 14 }}>{hotel.address}</div></div>}
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check In</div><div style={{ fontSize: 14 }}>{fmtDate(hotel.check_in_date)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Check Out</div><div style={{ fontSize: 14 }}>{fmtDate(hotel.check_out_date)}</div></div>
            {hotel.notes && <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Notes</div><div style={{ fontSize: 14 }}>{hotel.notes}</div></div>}
          </div>
        )}

        <div className="glass-card" style={{ overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 12px', padding: '8px 14px', borderBottom: '0.5px solid var(--glass-border)' }}>
            {['Name 1', 'Name 2', 'Room Type', 'Check In', 'Check Out', 'Notes', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>
          {rooms.length === 0 && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No rooms added yet.</div>}
          {rooms.map((room, i) => (
            <div key={room.id} style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 12px', padding: '10px 14px', alignItems: 'center', borderBottom: i < rooms.length - 1 ? '0.5px solid var(--glass-border)' : 'none' }}>
              <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_1' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s1 ? 'var(--text-primary)' : 'var(--mint)' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {room.s1 ? `${room.s1.first_name} ${room.s1.last_name}` : '+ Assign'}
              </div>
              <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_2' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s2 ? 'var(--text-primary)' : 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {room.s2 ? `${room.s2.first_name} ${room.s2.last_name}` : '+ Assign'}
              </div>
              <select value={room.room_type || 'Double'} onChange={e => handleUpdateRoom(room.id, 'room_type', e.target.value)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', width: '100%' }}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <EditableCell value={room.check_in_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_in_date', v)} />
              <EditableCell value={room.check_out_date} type="date" onSave={v => handleUpdateRoom(room.id, 'check_out_date', v)} />
              <EditableCell value={room.notes} onSave={v => handleUpdateRoom(room.id, 'notes', v)} placeholder="Notes" />
              <div onClick={() => handleRemoveRoom(room.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.4, textAlign: 'right' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0.4' }}>×</div>
            </div>
          ))}
          <div style={{ padding: '10px 14px', borderTop: rooms.length > 0 ? '0.5px solid var(--glass-border)' : 'none' }}>
            <span onClick={handleAddRoom} style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}>+ Add Room</span>
          </div>
        </div>
      </div>

      {unroomedStaff.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Unroomed Staff ({unroomedStaff.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unroomedStaff.map(s => (
              <div key={s.id} className="glass-card" style={{ padding: '6px 14px', fontSize: 13 }}>{s.first_name} {s.last_name}</div>
            ))}
          </div>
        </div>
      )}

      {editingHotel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditingHotel(false)}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 28, width: 500, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{hotel ? 'Edit Hotel' : 'Add Hotel'}</div>
            {[{ label: 'Hotel Name', key: 'hotel_name', type: 'text' }, { label: 'Address', key: 'address', type: 'text' }, { label: 'Check In', key: 'check_in_date', type: 'date' }, { label: 'Check Out', key: 'check_out_date', type: 'date' }, { label: 'Notes', key: 'notes', type: 'text' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '9px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }} value={hotelForm[f.key]} onChange={e => setHotelForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingHotel(false)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
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