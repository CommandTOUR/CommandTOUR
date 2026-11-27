'use client'

import React, { useEffect, useLayoutEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { confirmStaffMember } from '@/lib/confirmStaffMember'
import { quickToast } from '@/lib/quickToast'
import { canAssign, fetchBookings, blockedEventsFor } from '@/lib/staffingGuard'
import { findOverlaps, overlapReason } from '@/lib/staffingRule'
import { IconChecklist, IconTrash, IconCopy, IconX, IconChevronUp, IconPlus } from '@tabler/icons-react'
import StaffTile, { GhostTile } from './staffing/StaffTile'
import StaffingBoard from './staffing/StaffingBoard'
import SlotsPanel from './staffing/SlotsPanel'
import MoveDialog, { SwapLayout } from './staffing/MoveDialogs'
import ReworkPanel from './staffing/ReworkPanel'
import { bookedTravelTrips, releaseTravel, travelWarning, moveNote, removeNote } from '@/lib/travelRework'
import { resolveRework as resolveTrip, deleteTrip } from '@/lib/travel/trips'
import useUndoable from './staffing/useUndoable'
import useStaffingData, { cellKey } from './staffing/useStaffingData'
import { toYMD, getWeekendGroup, getWeekendDates, fmtWeekend, isPastEvent } from './staffing/weekend'
import StaffLegend from './staffing/StaffLegend'
import StaffPanel from './staffing/StaffPanel'
import { staffDisplayName, STATUS_OPTIONS, VIEW_PAD, Z_POPUP, Z_MENU, Z_TOAST, fmtEventRange } from './staffing/shared'
import { useAnchoredMenu } from './staffing/popup'

// ── HELPERS ────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── INLINE STAFF SEARCH ────────────────────────────────────────────────────

function InlineStaffSearch({ eventId, onClose, initialValue, checkAndAssign, tourPositionId, slotIndex, eventCity, positionTitle }) {
  const [query, setQuery] = useState(initialValue || '')
  const [results, setResults] = useState([])
  const [guards, setGuards] = useState({}) // staffId -> { ok, reason }, asked of the DATABASE (canAssign), not cached state
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // booked on exactly ONE other event this weekend: can be pulled over (with a confirmation)
  const isPull = (g) => !!g && !g.ok && g.conflicts?.length === 1 && g.conflicts[0].event_id !== eventId
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data: staffData } = await supabase.from('staff').select('id, first_name, last_name, display_name')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order('last_name', { ascending: true }).limit(8)
      if (cancelled) return
      setResults(staffData || [])
      setLoading(false)
      const checked = await Promise.all((staffData || []).map(s => canAssign(s.id, eventId).then(g => [s.id, { ok: g.ok, reason: g.reason, conflicts: g.conflicts || [] }])))
      if (!cancelled) setGuards(Object.fromEntries(checked))
    }, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, eventId])

  const showDropdown = query.trim().length >= 1
  const menuStyle = useAnchoredMenu(wrapperRef, showDropdown, 260, 300)
  const optionCount = results.length + (showDropdown ? 1 : 0)

  const handleSelect = async (s) => {
    const g = guards[s.id]
    // on ONE other event that weekend: allowed, the grid asks for a confirmation to move them. Anything else is refused.
    if (g && !g.ok && !isPull(g)) { quickToast(`${staffDisplayName(s)}: ${g.reason || 'Already booked'}. Nothing changed.`); return }
    setQuery('')
    setResults([])
    await checkAndAssign(s, tourPositionId, slotIndex, eventId, eventCity, positionTitle)
    onClose()
  }

  const handleCreate = async () => {
    const parts = query.trim().split(' ')
    const firstName = parts[0]
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
    const supabase = getSupabase()
    const { data, error } = await supabase.from('staff').insert([{ first_name: firstName, last_name: lastName }]).select().single()
    if (!error && data) await handleSelect(data)
  }

  const selectIndex = (idx) => {
    if (idx < 0 || idx >= optionCount) return
    if (idx < results.length) handleSelect(results[idx])
    else handleCreate()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (optionCount > 0) setActiveIndex(i => (i + 1) % optionCount) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (optionCount > 0) setActiveIndex(i => (i - 1 + optionCount) % optionCount) }
    else if (e.key === 'Enter') { e.preventDefault(); selectIndex(activeIndex >= 0 ? activeIndex : 0) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'Tab') { onClose() }
  }

  return (
    <div ref={wrapperRef} onClick={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'left' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          const val = e.target.value
          setQuery(val)
          setActiveIndex(-1)
          if (val.trim().length < 1) { setResults([]); setGuards({}) }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        placeholder="Type a Name..."
        aria-label="Search Staff"
        style={{ fontFamily: 'inherit', fontSize: 13, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border-strong)', background: 'var(--surface-input)', color: 'var(--text-primary)', caretColor: 'var(--color-success)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {showDropdown && menuStyle && ReactDOM.createPortal(
        <div role="listbox" data-popup="search" data-assigning="" onMouseDown={e => e.preventDefault()} style={{ ...menuStyle, zIndex: Z_MENU, boxSizing: 'border-box', background: 'var(--surface-card)', border: '0.5px solid var(--border-stronger)', borderRadius: 8, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          {loading && <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)' }}>No results</div>}
          {results.map((s, i) => {
            const g = guards[s.id]
            const pull = isPull(g)
            const blocked = !!g && !g.ok && !pull
            return (
              <div key={s.id} role="option" aria-selected={i === activeIndex} aria-disabled={blocked}
                data-blocked={blocked ? 'true' : undefined} data-pull={pull ? 'true' : undefined}
                onMouseDown={e => { e.preventDefault(); selectIndex(i) }}
                onMouseEnter={() => setActiveIndex(i)}
                style={{ padding: '6px 10px', cursor: blocked ? 'not-allowed' : 'pointer', background: i === activeIndex ? 'color-mix(in srgb, var(--color-info) 10%, transparent)' : 'transparent', opacity: blocked ? 0.5 : 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffDisplayName(s)}</div>
                {pull && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>On {g.conflicts[0].events?.city || 'another event'} this weekend · Move here</div>}
                {blocked && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{g.reason || 'Already booked'}</div>}
              </div>
            )
          })}
          <div
            onMouseDown={e => { e.preventDefault(); selectIndex(results.length) }}
            onMouseEnter={() => setActiveIndex(results.length)}
            style={{ padding: '7px 10px', fontSize: 13, cursor: 'pointer', color: 'var(--color-info)', background: activeIndex === results.length ? 'color-mix(in srgb, var(--color-info) 10%, transparent)' : 'transparent', borderTop: results.length > 0 ? '1px solid var(--border-default)' : 'none' }}>
            + Create &quot;{query.trim()}&quot;
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function CheckboxIcon({ isChecked }) {
  return (
    <div style={{ width: 16, height: 16, flexShrink: 0, border: '1.5px solid ' + (isChecked ? 'var(--color-success)' : 'var(--border-stronger)'), borderRadius: 4, background: isChecked ? '#33FF99' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isChecked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function SelectionBar({ count, busy, onSetStatus, onDelete, onCopy, onExit, inline = false }) {
  const [statusOpen, setStatusOpen] = useState(false)
  const statusBtnRef = useRef(null)
  const statusMenuRef = useRef(null)
  const statusStyle = useAnchoredMenu(statusBtnRef, statusOpen, 180, 4 * 38 + 10)
  useEffect(() => {
    if (!statusOpen) return
    const onDown = (e) => { if (!statusBtnRef.current?.contains(e.target) && !statusMenuRef.current?.contains(e.target)) setStatusOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setStatusOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [statusOpen])
  const btn = { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '6px 12px', borderRadius: 6, cursor: busy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.6 : 1 }
  return (
    <div
      role="toolbar"
      aria-label="Bulk Actions"
      style={{
        ...(inline ? { position: 'relative', alignSelf: 'stretch' } : { position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 300 }),
        maxWidth: inline ? '100%' : 'calc(100vw - 24px)', boxSizing: 'border-box',
        background: 'color-mix(in srgb, var(--surface-card) 94%, transparent)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', boxShadow: 'var(--glass-tile-shadow)',
        padding: '8px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{count} selected</span>

      <div style={{ position: 'relative' }}>
        <button ref={statusBtnRef} disabled={busy} onClick={() => setStatusOpen(v => !v)} aria-haspopup="menu" aria-expanded={statusOpen} style={{ ...btn, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)' }}>
          Set Status <IconChevronUp size={14} style={{ transform: statusOpen ? 'none' : 'rotate(180deg)' }} />
        </button>
        {statusOpen && statusStyle && ReactDOM.createPortal(
          <div ref={statusMenuRef} role="menu" data-popup="set-status" style={{ ...statusStyle, zIndex: Z_MENU, boxSizing: 'border-box', overflowY: 'auto', background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', boxShadow: 'var(--glass-tile-shadow)', padding: 4 }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                role="menuitem"
                onClick={() => { setStatusOpen(false); onSetStatus(opt.value) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', fontFamily: 'inherit', fontSize: 14, padding: '7px 10px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>

      <button disabled={busy} onClick={onCopy} style={{ ...btn, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)' }}>
        <IconCopy size={16} /> Copy to Events
      </button>
      <button disabled={busy} onClick={onDelete} style={{ ...btn, border: '0.5px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)' }}>
        <IconTrash size={16} /> Delete
      </button>
      <button onClick={onExit} aria-label="Exit Selection" style={{ ...btn, border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)' }}>
        <IconX size={16} /> Done
      </button>
    </div>
  )
}

// Copy the selected assignments to other events. Step 1 pick events, step 2 review a preview
// (what will be copied / skipped and why), then write. Never overwrites an occupied cell and never writes
// into a locked one.
function BulkCopyModal({ cells, events, tours, tpByPosTour, getInfo, onClose, onDone, undoable }) {
  const [step, setStep] = useState('pick') // 'pick' | 'preview'
  // each selected person's assignments from the DATABASE (not just loaded events), for the double-booking rule
  const [bookingsMap, setBookingsMap] = useState(null)
  useEffect(() => {
    let cancelled = false
    const ids = [...new Set(cells.map(c => c.staffId))]
    Promise.all(ids.map(id => fetchBookings(id).then(b => [id, b]).catch(() => [id, []])))
      .then(entries => { if (!cancelled) setBookingsMap(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [cells])
  const [checked, setChecked] = useState([])
  const [tourFilter, setTourFilter] = useState(() => {
    const tourIds = [...new Set(cells.map(c => c.sourceTourId))]
    return tourIds.length === 1 ? tourIds[0] : 'all'
  })
  const [yearFilter, setYearFilter] = useState('all')
  const [writing, setWriting] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !writing) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, writing])

  const today = toYMD(new Date())
  const years = [...new Set(events.map(e => (e.load_in_date || '').slice(0, 4)).filter(Boolean))].sort()
  const candidates = events
    .filter(e => e.load_in_date && e.load_in_date >= today)
    .filter(e => tourFilter === 'all' || e.tour_id === tourFilter)
    .filter(e => yearFilter === 'all' || e.load_in_date.startsWith(yearFilter))
    .sort((a, b) => a.load_in_date.localeCompare(b.load_in_date))
  // events nobody in the selection can go to (copies keep the original, so any same-weekend booking blocks)
  const blockedReason = (ev) => {
    if (!bookingsMap) return null
    let first = null
    for (const c of cells) {
      const conflicts = findOverlaps({ targetEvent: ev, assignments: bookingsMap[c.staffId] || [] })
      if (!conflicts.length) return null
      if (!first) first = `${c.staffName}: ${overlapReason(conflicts)}`
    }
    return cells.length > 1 ? `Everyone selected is booked (${first})` : first
  }
  const selectable = candidates.filter(e => !blockedReason(e))
  const allChecked = selectable.length > 0 && selectable.every(e => checked.includes(e.id))
  const toggle = (id) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => setChecked(allChecked ? [] : selectable.map(e => e.id))
  const fmtD = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  // Build the plan: every (selected person x target event) is either copyable or skipped with a reason
  const buildPlan = () => {
    const ok = []
    const skipped = []
    const plannedSlots = new Set()
    const plannedWeekend = new Set()
    const targets = events.filter(e => checked.includes(e.id)).sort((a, b) => a.load_in_date.localeCompare(b.load_in_date))
    for (const ev of targets) {
      const wk = getWeekendDates(ev.load_in_date)
      for (const c of cells) {
        const label = `${c.staffName} · ${c.positionTitle}`
        const where = `${formatLocation(ev.city, ev.state, ev.country, 'compact')} ${fmtD(ev.load_in_date)}`
        const skip = (reason) => skipped.push({ label, where, reason })
        if (c.sourceEventId === ev.id) { skip('Same event as the source'); continue }
        const tp = tpByPosTour[c.positionId]?.[ev.tour_id]
        if (!tp) { skip('Position is not on this tour'); continue }
        const info = getInfo(c.positionId, c.slotIndex, ev)
        if (info.state === 'FILLED') { skip('Target slot is occupied'); continue }
        if (info.state === 'LOCKED' || info.state === 'HATCHED' || info.state === 'FULLY_LOCKED') { skip('Target slot is locked'); continue }
        const conflicts = findOverlaps({ targetEvent: ev, assignments: bookingsMap?.[c.staffId] || [] })
        if (conflicts.length) { skip(overlapReason(conflicts)); continue }
        const slotKey = tp.id + '__' + c.slotIndex + '__' + ev.id
        if (plannedSlots.has(slotKey)) { skip('Another selected person is copied to this slot'); continue }
        const wkKey = c.staffId + '__' + wk.saturday_date
        if (plannedWeekend.has(wkKey)) { skip('Also being copied to another event that weekend'); continue }
        plannedSlots.add(slotKey)
        plannedWeekend.add(wkKey)
        ok.push({ label, where, tp, ev, c })
      }
    }
    return { ok, skipped }
  }
  const [plan, setPlan] = useState({ ok: [], skipped: [] })

  const goPreview = () => { if (!bookingsMap) return; setPlan(buildPlan()); setStep('preview') }

  const write = async () => {
    setWriting(true)
    const supabase = getSupabase()
    let copied = 0
    let runtimeSkipped = 0
    const copyAll = async () => {
    for (const item of plan.ok) {
      const { tp, ev, c } = item
      try {
        // re-check right before writing: never overwrite an occupied or locked cell
        const { data: existing } = await supabase.from('staff_assignments')
          .select('id, staff_id, locked').eq('tour_position_id', tp.id).eq('slot_index', c.slotIndex).eq('event_id', ev.id).limit(1)
        const row = existing && existing[0]
        if (row && (row.staff_id || row.locked)) { runtimeSkipped++; continue }
        // double-booking rule, checked against the database right before writing
        const guard = await canAssign(c.staffId, ev.id)
        if (!guard.ok) { runtimeSkipped++; continue }
        let error
        if (row) {
          ;({ error } = await supabase.from('staff_assignments').update({ staff_id: c.staffId, status: 'confirmed', confirmed: true }).eq('id', row.id))
        } else {
          ;({ error } = await supabase.from('staff_assignments').insert([{ tour_position_id: tp.id, slot_index: c.slotIndex, event_id: ev.id, staff_id: c.staffId, status: 'confirmed', confirmed: true }]))
        }
        if (error) { console.error('[bulk copy] write error:', error); runtimeSkipped++; continue }
        // new assignments are Confirmed, so they get the same travel rows as a single confirmed assignment
        await confirmStaffMember({ supabase, eventId: ev.id, staffId: c.staffId, confirm: true })
        copied++
      } catch (err) {
        console.error('[bulk copy] error', err)
        runtimeSkipped++
      }
    }
    }
    await undoable(`Copied ${plan.ok.length} assignment${plan.ok.length === 1 ? '' : 's'}`, plan.ok.map(i => i.ev.id), copyAll)
    setWriting(false)
    onDone({ copied, skipped: plan.skipped.length + runtimeSkipped })
  }

  const labelCss = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)' }
  const selectCss = { fontFamily: 'inherit', fontSize: 14, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-input)', color: 'var(--text-primary)', cursor: 'pointer' }

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !writing) onClose() }}
    >
      <div role="dialog" aria-modal="true" style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: '20px 0', width: 600, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Copy to Events</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {cells.length} assignment{cells.length === 1 ? '' : 's'} · same position and slot, added as Confirmed
            </div>
          </div>
          <button onClick={onClose} disabled={writing} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}><IconX size={20} /></button>
        </div>

        {step === 'pick' ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '0 20px 10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelCss}>Tour</span>
                <select value={tourFilter} onChange={e => setTourFilter(e.target.value)} style={selectCss}>
                  <option value="all">All Tours</option>
                  {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelCss}>Year</span>
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={selectCss}>
                  <option value="all">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={toggleAll} style={{ ...selectCss, color: 'var(--color-info)', border: '0.5px solid var(--color-info)', background: 'transparent' }}>{allChecked ? 'None' : 'Select All'}</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', borderTop: '0.5px solid var(--border-default)', borderBottom: '0.5px solid var(--border-default)', minHeight: 120 }}>
              {candidates.length === 0 && <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15 }}>No upcoming events match</div>}
              {candidates.map(ev => {
                const tour = tours.find(t => t.id === ev.tour_id)
                const isChecked = checked.includes(ev.id)
                const reason = blockedReason(ev)
                return (
                  <div
                    key={ev.id}
                    onClick={() => { if (!reason) toggle(ev.id) }}
                    title={reason || undefined}
                    style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', minHeight: 44, padding: '6px 20px', cursor: reason ? 'not-allowed' : 'pointer', opacity: reason ? 0.5 : 1, borderBottom: '0.5px solid var(--border-default)', borderLeft: isChecked ? '3px solid var(--color-info)' : '3px solid transparent', background: isChecked ? 'color-mix(in srgb, var(--color-info) 8%, transparent)' : 'transparent' }}
                  >
                    <CheckboxIcon isChecked={isChecked} />
                    <span style={{ fontSize: 14, minWidth: 64, whiteSpace: 'nowrap' }}>{fmtD(ev.load_in_date)}</span>
                    <span style={{ fontSize: 14, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatLocation(ev.city, ev.state, ev.country, 'compact')}</span>
                    {tour && <span style={{ fontSize: 13, fontWeight: 600, color: tour.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{tour.name}</span>}
                    {reason && <span style={{ flexBasis: '100%', paddingLeft: 28, fontSize: 12, fontWeight: 600, color: 'var(--color-danger)' }}>{reason}</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 20px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{checked.length} event{checked.length === 1 ? '' : 's'} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ ...selectCss, color: 'var(--text-primary)' }}>Cancel</button>
                <button onClick={goPreview} disabled={checked.length === 0 || !bookingsMap} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: checked.length === 0 ? 'default' : 'pointer', opacity: checked.length === 0 ? 0.5 : 1 }}>Review</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', borderTop: '0.5px solid var(--border-default)', borderBottom: '0.5px solid var(--border-default)', padding: '10px 20px', minHeight: 120 }}>
              <div style={{ ...labelCss, marginBottom: 6 }}>Will Copy ({plan.ok.length})</div>
              {plan.ok.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>Nothing can be copied.</div>}
              {plan.ok.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, padding: '4px 0' }}>
                  <span style={{ fontWeight: 600 }}>{it.label}</span>
                  <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{it.where}</span>
                </div>
              ))}
              {plan.skipped.length > 0 && (
                <>
                  <div style={{ ...labelCss, margin: '14px 0 6px', color: 'var(--status-1hold-text)' }}>Skipped ({plan.skipped.length})</div>
                  {plan.skipped.map((it, i) => (
                    <div key={i} style={{ fontSize: 14, padding: '4px 0' }}>
                      <div><span style={{ fontWeight: 600 }}>{it.label}</span> <span style={{ color: 'var(--text-secondary)' }}>→ {it.where}</span></div>
                      <div style={{ fontSize: 13, color: 'var(--status-1hold-text)' }}>{it.reason}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 20px 0', flexWrap: 'wrap' }}>
              <button onClick={() => setStep('pick')} disabled={writing} style={{ ...selectCss, color: 'var(--text-primary)' }}>Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} disabled={writing} style={{ ...selectCss, color: 'var(--text-primary)' }}>Cancel</button>
                <button onClick={write} disabled={writing || plan.ok.length === 0} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: (writing || plan.ok.length === 0) ? 'default' : 'pointer', opacity: (writing || plan.ok.length === 0) ? 0.5 : 1 }}>
                  {writing ? 'Copying…' : `Copy ${plan.ok.length}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── CONFLICT WIZARD MODAL ───────────────────────────────────────────────────

// Move target is a locked cell, or a position the target tour does not have: offer a way forward instead of refusing
function BlockedMoveWizard({ wizard, onClose }) {
  const { incomingStaff, reason, positionTitle, targetCity, tourName, departmentName, cells, onAddPositionMove, onPickCell } = wizard
  const [view, setView] = useState('choice') // 'choice' | 'pick'
  const [busy, setBusy] = useState(false)
  const run = async (fn, arg) => { setBusy(true); await fn(arg); setBusy(false) }
  const groups = []
  cells.forEach(c => {
    let g = groups.find(x => x.dept === c.dept)
    if (!g) { g = { dept: c.dept, items: [] }; groups.push(g) }
    g.items.push(c)
  })
  const optBtn = { width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, borderRadius: 8, padding: '11px 14px', background: 'transparent', color: 'var(--text-primary)' }
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div id="conflict-wizard-modal" role="dialog" aria-modal="true" style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 22, width: 440, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              Moving to {positionTitle} · {targetCity}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{incomingStaff.first_name} {incomingStaff.last_name}</div>
          </div>
          <div onClick={() => { if (!busy) onClose() }} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1 }}>×</div>
        </div>

        <div style={{ background: 'var(--status-1hold-bg)', border: '0.5px solid var(--status-1hold-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--status-1hold-text)', fontWeight: 600 }}>
          {reason === 'occupied'
            ? `Every ${positionTitle} cell at ${targetCity} is already taken.`
            : `${tourName || 'That tour'} has no ${positionTitle} position.`}
          {' '}{incomingStaff.first_name} stays where they are until you choose.
        </div>

        {view === 'choice' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {reason === 'occupied' ? null : (
              <button disabled={busy} onClick={() => run(onAddPositionMove)} style={{ ...optBtn, border: '0.5px solid var(--color-info)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-info)' }}>Add This Position to That Tour and Move Here</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Adds {positionTitle}{departmentName ? ` (${departmentName})` : ''}, 1 slot, to {tourName}. You will be asked to confirm.</div>
              </button>
            )}
            <button disabled={busy} onClick={() => setView('pick')} style={{ ...optBtn, border: '0.5px solid var(--border-strong)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Choose a Different Position</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Pick any open cell at {targetCity}.</div>
            </button>
            <button disabled={busy} onClick={onClose} style={{ ...optBtn, textAlign: 'center', border: '0.5px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 13 }}>Cancel</button>
          </div>
        ) : (
          <div>
            <button onClick={() => setView('choice')} disabled={busy} style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10, color: 'var(--color-info)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            {groups.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '8px 0' }}>No open cells at {targetCity}.</div>}
            {groups.map(g => (
              <div key={g.dept} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', marginBottom: 4 }}>{g.dept}</div>
                {g.items.map(c => (
                  <button key={c.key} disabled={busy} onClick={() => run(onPickCell, c)}
                    style={{ ...optBtn, padding: '8px 12px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14,
                      border: c.isOwn ? '1.5px solid var(--color-info)' : '0.5px solid var(--border-default)',
                      background: c.isOwn ? 'color-mix(in srgb, var(--color-info) 10%, transparent)' : 'transparent' }}>
                    <span style={{ fontWeight: c.isOwn ? 700 : 500 }}>{c.positionTitle}{c.isOwn ? ' (same position)' : ''}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Slot {c.slotIndex}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Swap: pick WHO to swap with from everyone assigned on the other event
function SwapPickerModal({ picker, onClose, onConfirm, onReplace }) {
  const [selected, setSelected] = useState(picker.preselect || null)
  const [busy, setBusy] = useState(false)
  const [warns, setWarns] = useState([]) // booked travel of the two people, for the chosen swap
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const groups = []
  picker.options.forEach(o => {
    let g = groups.find(x => x.dept === o.dept)
    if (!g) { g = { dept: o.dept, items: [] }; groups.push(g) }
    g.items.push(o)
  })
  const chosen = picker.options.find(o => o.key === selected)
  const go = async () => { if (!chosen) return; setBusy(true); await onConfirm(chosen); setBusy(false) }
  useEffect(() => {
    let cancelled = false
    if (!chosen || !picker.warningsFor) return
    picker.warningsFor(chosen).then(w => { if (!cancelled) setWarns(w) })
    return () => { cancelled = true; setWarns([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter' && chosen && !busy && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); go() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, busy])
  const goReplace = async () => {
    if (!chosen || !onReplace) return
    setBusy(true); await onReplace(chosen); setBusy(false)
  }
  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div role="dialog" aria-modal="true" style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 22, width: 560, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Swap with someone at {picker.otherCity}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{picker.staffName} swaps places with…</div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 80 }}>
          {groups.length === 0 && <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '10px 0' }}>Nobody is assigned at {picker.otherCity}.</div>}
          {groups.map(g => (
            <div key={g.dept} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', marginBottom: 4 }}>{g.dept}</div>
              {g.items.map(o => {
                const on = o.key === selected
                const st = STATUS_OPTIONS.find(x => x.value === o.status)
                return (
                  <button key={o.key} disabled={busy} onClick={() => setSelected(o.key)}
                    style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', marginBottom: 4, padding: '8px 12px', borderRadius: 8, color: 'var(--text-primary)',
                      border: on ? '1.5px solid var(--color-info)' : '0.5px solid var(--border-default)',
                      background: on ? 'color-mix(in srgb, var(--color-info) 10%, transparent)' : 'transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{o.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>{o.positionTitle} · Slot {o.slotIndex}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: st?.color || 'var(--text-secondary)', flexShrink: 0 }}>{st?.label || o.status}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        {chosen && (
          <div data-swap-preview="" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
            {warns.length > 0 && (
              <div data-travel-warning="" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--color-danger)', background: 'color-mix(in srgb, var(--color-danger) 8%, var(--surface-card))' }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Booked Travel</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, fontWeight: 600 }}>{warns.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            <SwapLayout a={{ name: picker.staffName, position: picker.aPosition, event: picker.aEvent }} b={{ name: chosen.name, position: chosen.slotIndex > 1 ? `${chosen.positionTitle} ${chosen.slotIndex}` : chosen.positionTitle, event: picker.bEvent }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onClose} disabled={busy} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
          {onReplace && (
            <button onClick={goReplace} disabled={!chosen || busy} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: (!chosen || busy) ? 'default' : 'pointer', opacity: (!chosen || busy) ? 0.5 : 1 }}>Replace Instead</button>
          )}
          <button onClick={go} disabled={!chosen || busy} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: (!chosen || busy) ? 'default' : 'pointer', opacity: (!chosen || busy) ? 0.5 : 1 }}>
            {busy ? 'Swapping…' : 'Swap'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ConflictWizardModal({ wizard, onClose }) {
  if (!wizard || typeof document === 'undefined') return null
  return ReactDOM.createPortal(<BlockedMoveWizard wizard={wizard} onClose={onClose} />, document.body)
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────

// Staffing tiles: one tall tile per event (tour-colored border) with department sections of compact staff tiles.
// Shared by the all-staff page (/staffing-grid) and the tour page's staffing tab (tourId given).
//   tourId  limit to one tour        year  load events whose load-in falls in that year (null = every year, tour tab only)
export default function StaffingGrid({ tourId, year, searchQuery = '' }) {
  const router = useRouter()
  const [showPast, setShowPast] = useState(false) // past events (end date before today) are hidden until asked for

  // Data + derived maps come from the shared (read-only) hook; this component adds every write path.
  const {
    loading, reload, departments, positions, tourPositions, setTourPositions, tours, events, assignments, setAssignments,
    positionsById, toursById, eventsById, tourPositionsById, tpByPosTour, resolveAssignment,
    departmentsWithRows, getCellInfo, orderedEvents, filteredEvents, bookingsByStaff, conflictBookingFor,
    visiblePositionRows, eventModels, buildBoard, reworkByStaff, ghostsByEvent,
  } = useStaffingData({ tourId, year, showPastEvents: showPast, searchQuery })

  const [activeCell, setActiveCell] = useState(null) // { positionId, slotIndex, eventId } while typing a name into an open tile
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkCopy, setBulkCopy] = useState(null) // snapshot of selected cells while the copy modal is open
  const selectAnchor = useRef(null)
  const selectedKeysRef = useRef(new Set())
  const assignmentsRef = useRef([])
  const [conflictWizard, setConflictWizard] = useState(null)
  const [swapPicker, setSwapPicker] = useState(null)
  const [toast, setToast] = useState(null)
  const [conflictModal, setConflictModal] = useState(null)
  const [panel, setPanel] = useState(null) // { tpId, slotIndex, eventId, blocked, loadingBlocked }
  const [drag, setDrag] = useState(null) // { src, personId, blocked | null } while a tile is being dragged
  const dragRef = useRef(null)
  const scrollRef = useRef(null)
  const stripRef = useRef(null)
  const [dragOverEvent, setDragOverEvent] = useState(null)
  const [strayWeekend, setStrayWeekend] = useState(false) // the pointer is over a cell in ANOTHER weekend (not a drop target)
  const [dropHover, setDropHover] = useState(null) // key of the cell under the pointer while dragging (its label is derived from the current hint)
  const [slotsOpen, setSlotsOpen] = useState(false)
  const [moveDialog, setMoveDialog] = useState(null) // the swap / pull / unlock-and-move confirmation
  const [reworkFor, setReworkFor] = useState(null) // { staffId, eventId | null }: the Travel Needs Rework panel
  const pastAnchor = useRef(null)
  // Flip the toggle without the view jumping: remember where the first upcoming column is, and put it back after the columns change.
  const togglePast = () => {
    const sc = scrollRef.current
    const first = filteredEvents.find(ev => !isPastEvent(ev))
    const h = first && sc ? document.querySelector(`[data-event-header="${first.id}"]`) : null
    pastAnchor.current = h ? { id: first.id, x: h.getBoundingClientRect().left - sc.getBoundingClientRect().left + sc.scrollLeft, prev: events } : null
    setShowPast(v => !v)
  }
  useLayoutEffect(() => {
    const a = pastAnchor.current
    if (!a || events === a.prev) return // wait until the new events have actually rendered
    pastAnchor.current = null
    const sc = scrollRef.current
    const h = sc && document.querySelector(`[data-event-header="${a.id}"]`)
    if (h) sc.scrollLeft += (h.getBoundingClientRect().left - sc.getBoundingClientRect().left + sc.scrollLeft) - a.x
  }, [events])
  const [collapsed, setCollapsed] = useState(new Set())
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'attention'
  // touch / phone: drag is off (the panel's Move covers it)
  const [isPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px), (pointer: coarse)').matches)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const tmpSeq = useRef(0) // ids for optimistic rows

  // ── UNDO ────────────────────────────────────────────────────────────────
  // Every change runs through undoable() (see components/staffing/useUndoable.js).
  const { undoable, toastElement: undoToastElement } = useUndoable({
    tourIdsFor: (evIds) => evIds.map(id => eventsById[id]?.tour_id),
    onUndone: () => reload(),
    onMessage: (m) => showToast(m),
  })

  // ── WRITE OPERATIONS ─────────────────────────────────────────────────────

  const clearAssignment = async (tp, slotIndex, event, resolvedAssignment) => {
    if (!resolvedAssignment) return false
    const supabase = getSupabase()
    if (resolvedAssignment.event_id === event.id) {
      const { error } = await supabase.from('staff_assignments').delete().eq('id', resolvedAssignment.id)
      if (error) { console.error('clearAssignment failed:', error); return false }
      setAssignments(prev => prev.filter(a => a.id !== resolvedAssignment.id))
      if (tp && tp.quantity_needed === 0) {
        const { data: remaining } = await supabase
          .from('staff_assignments')
          .select('id')
          .eq('tour_position_id', tp.id)
          .limit(1)
        if (!remaining || remaining.length === 0) {
          await supabase.from('tour_positions')
            .delete().eq('id', tp.id)
          setTourPositions(prev => prev.filter(t => t.id !== tp.id))
        }
      }
    } else {
      const { data, error } = await supabase.from('staff_assignments')
        .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: null, event_id: event.id, status: 'pending', confirmed: false }])
        .select().single()
      if (error) { console.error('clearAssignment failed:', error); return false }
      if (data) setAssignments(prev => [...prev, data])
    }
    return true
  }

  const doAssign = async (tp, slotIndex, event, staffMember, removeFromEventId) => {
    const supabase = getSupabase()

    if (removeFromEventId) {
      const otherBookings = (bookingsByStaff[staffMember.id] || []).filter(b => b.event_id === removeFromEventId)
      for (const b of otherBookings) {
        const otherTp = tourPositionsById[b.tour_position_id]
        const otherEvent = eventsById[b.event_id]
        const resolved = resolveAssignment(b.tour_position_id, b.slot_index, b.event_id)
        if (otherTp && otherEvent && resolved) await clearAssignment(otherTp, b.slot_index, otherEvent, resolved)
      }
    }

    const existingEventRow = assignments.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && a.event_id === event.id)
    if (existingEventRow?.locked) {
      quickToast('That cell is locked. Unlock it first.')
      return { error: new Error('cell locked') }
    }
    if (existingEventRow) {
      const { error } = await supabase.from('staff_assignments')
        .update({ staff_id: staffMember.id, status: 'confirmed', confirmed: true }).eq('id', existingEventRow.id)
      if (error) return { error }
      setAssignments(prev => prev.map(a => a.id === existingEventRow.id ? { ...a, staff_id: staffMember.id, status: 'confirmed', confirmed: true, staff: staffMember } : a))
      return { error: null }
    }

    const { data, error } = await supabase.from('staff_assignments')
      .upsert(
        [{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: staffMember.id, event_id: event.id, status: 'confirmed', confirmed: true }],
        { onConflict: 'tour_position_id,slot_index,event_id', ignoreDuplicates: false }
      )
      .select('id, tour_position_id, slot_index, staff_id, event_id, status, confirmed, notes')
      .single()
    if (error) return { error }
    setAssignments(prev => {
      const existing = prev.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && a.event_id === event.id)
      if (existing) {
        return prev.map(a => a.id === existing.id ? { ...a, ...data, staff: staffMember } : a)
      }
      return [...prev, { ...data, staff: staffMember }]
    })
    if (data?.confirmed && data?.staff_id) {
      await confirmStaffMember({
        supabase,
        eventId: event.id,
        staffId: data.staff_id,
        confirm: true
      })
    }
    return { error: null }
  }

  const applyStatusChange = async (tp, slotIndex, event, resolvedAssignment, status) => {
    if (!resolvedAssignment) return false
    // Defensive: a cell only ever resolves to THIS event's row or the tour-wide default (event_id null).
    // A row that belongs to a different event, or a locked row, is never used to create an assignment here.
    if (resolvedAssignment.locked || (resolvedAssignment.event_id && resolvedAssignment.event_id !== event.id)) {
      quickToast('That assignment does not belong to this event. Nothing changed.')
      return false
    }
    const supabase = getSupabase()
    const confirmed = status === 'confirmed'
    if (resolvedAssignment.event_id === event.id) {
      // Optimistic: show the new status now, revert if the save fails
      const prevStatus = resolvedAssignment.status
      const prevConfirmed = resolvedAssignment.confirmed
      setAssignments(prev => prev.map(a => a.id === resolvedAssignment.id ? { ...a, status, confirmed } : a))
      const { error } = await supabase.from('staff_assignments').update({ status, confirmed }).eq('id', resolvedAssignment.id)
      if (error) {
        setAssignments(prev => prev.map(a => a.id === resolvedAssignment.id ? { ...a, status: prevStatus, confirmed: prevConfirmed } : a))
        quickToast('Could not save status. Reverted.')
        return false
      }
    } else {
      const { data, error } = await supabase.from('staff_assignments')
        .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: resolvedAssignment.staff_id, event_id: event.id, status, confirmed }])
        .select().single()
      if (error) { quickToast('Could not save status. Reverted.'); return false }
      if (data) setAssignments(prev => [...prev, { ...data, staff: resolvedAssignment.staff }])
    }
    const staffId = resolvedAssignment.staff_id
    if (staffId) {
      await confirmStaffMember({
        supabase,
        eventId: event.id,
        staffId,
        confirm: status === 'confirmed'
      })
    }
    return true
  }

  // ── small helpers for the confirmation dialogs ───────────────────────────
  const endSentence = (t) => (/[.!?]$/.test(t || '') ? t : `${t}.`)
  const eventInfo = (ev) => ({
    place: ev.country ? formatLocation(ev.city, ev.state, ev.country, 'compact') : [ev.city, ev.state].filter(Boolean).join(', '),
    range: fmtEventRange(ev), tour: toursById[ev.tour_id]?.name, color: toursById[ev.tour_id]?.color,
  })
  const positionLabel = (position, slotIndex) => (position ? (slotIndex > 1 ? `${position.title} ${slotIndex}` : position.title) : 'Position')
  const sameWeekend = (evA, evB) => !!evA && !!evB && !!getWeekendGroup(evA.load_in_date) && getWeekendGroup(evA.load_in_date) === getWeekendGroup(evB.load_in_date)

  // ── booked travel (see lib/travelRework.js) ──────────────────────────────
  // Entered trips are NEVER deleted here: they are kept and flagged "needs rework". Empty trips are removed.
  const leaveEventTravel = async (supabase, eventId, staffId, note) => {
    try { return await releaseTravel(supabase, { eventId, staffId, note }) }
    catch (e) { console.error('flagging travel failed:', e); quickToast('Booked travel was kept, but it could not be flagged. Please check it.'); return { flagged: 0 } }
  }
  // Flagged travel for one person, grouped by the event they left: [{ eventId, eventLabel, rows }]
  const reworkGroupsFor = (staffId, onlyEventId = null) => (reworkByStaff[staffId] || [])
    .filter(g => !onlyEventId || g.eventId === onlyEventId)
    .map(g => { const ev = eventsById[g.eventId]; return { eventId: g.eventId, eventLabel: ev ? `${ev.city} · ${fmtEventRange(ev)}` : 'Event', rows: g.rows } })
  // Mark resolved (clears the flag) or delete the row. Both undoable.
  const resolveRework = async (r) => {
    await undoable('Travel marked resolved', [r.event_id], () => resolveTrip(getSupabase(), r.id))
    reload()
  }
  const deleteRework = async (r) => {
    await undoable('Travel row deleted', [r.event_id], () => deleteTrip(getSupabase(), r.id))
    reload()
  }

  // tooltip for the marker on a tile: why this person has travel needing rework
  const reworkTooltip = (staffId) => {
    const groups = reworkGroupsFor(staffId)
    if (!groups.length) return null
    const notes = groups.map(g => g.rows[0]?.rework_note).filter(Boolean)
    return `Travel Needs Rework${notes.length ? `: ${notes.join('; ')}` : ''}`
  }

  // The warning line(s) for someone about to leave an event, from the DATABASE right now. [] when nothing is booked.
  const travelWarningsFor = async (people) => {
    const sb = getSupabase(); const out = []
    for (const { name, event, staffId } of people) {
      const trips = await bookedTravelTrips(sb, event.id, staffId)
      if (trips.length) out.push(travelWarning(name, event.city, trips))
    }
    return out
  }
  const flaggedNote = (city) => `Booked travel stays on ${city}, flagged Travel Needs Rework.`
  const NEEDS = { status: 'needs_attention', confirmed: false }

  // A status change from the dot menu / panel: applies at once, with an Undo toast
  const changeStatus = (tp, slotIndex, event, assignment, status) =>
    undoable(`${staffDisplayName(assignment.staff) || 'Staff'}: ${STATUS_OPTIONS.find(o => o.value === status)?.label || status}`, [event.id],
      () => applyStatusChange(tp, slotIndex, event, assignment, status))

  // ── SAFE CELL MOVES ───────────────────────────────────────────────────────
  // Rule: the new placement is written and checked FIRST; the original is only removed after that succeeded.
  // A failure leaves the original untouched and shows an error toast.

  // The same position on the target event's tour (positions are tour-wide, each tour has its own tour_positions row)
  const targetTpFor = (srcTpId, targetEvent) => {
    const src = tourPositionsById[srcTpId]
    if (!src || !targetEvent) return null
    return src.tour_id === targetEvent.tour_id ? src : (tpByPosTour[src.position_id]?.[targetEvent.tour_id] || null)
  }

  // Put a person into one cell: reuses an empty event-specific row, never overwrites a person or a lock.
  const placeStaffInCell = async (supabase, { staffId, tpId, slotIndex, eventId, status = 'confirmed' }) => {
    const { data: existing, error: selErr } = await supabase.from('staff_assignments')
      .select('id, staff_id, locked').eq('tour_position_id', tpId).eq('slot_index', slotIndex).eq('event_id', eventId).maybeSingle()
    if (selErr) return { error: selErr }
    if (existing?.locked) return { error: new Error('that cell is locked') }
    if (existing?.staff_id) return { error: new Error('that cell is already occupied') }
    const confirmed = status === 'confirmed'
    if (existing) {
      const { error } = await supabase.from('staff_assignments').update({ staff_id: staffId, status, confirmed }).eq('id', existing.id)
      return { error }
    }
    const { error } = await supabase.from('staff_assignments')
      .insert([{ tour_position_id: tpId, slot_index: slotIndex, event_id: eventId, staff_id: staffId, status, confirmed }])
    return { error }
  }

  const sourceFromAssignmentId = (id, fallbackEventId) => {
    const row = assignmentsRef.current.find(a => a.id === id)
    if (!row) return null
    const tp = tourPositionsById[row.tour_position_id]
    const event = eventsById[row.event_id || fallbackEventId]
    return tp && event ? { tp, slotIndex: row.slot_index, event, row } : null
  }
  // MOVE: place at the target, then remove from the source. Lands Confirmed on the target, or Needs Attention when the old
  // assignment had booked travel (that travel is kept on the old event and flagged for rework).
  const moveStaffToCell = async (staffId, source, target) => {
    const supabase = getSupabase()
    const crossEvent = source.event.id !== target.event.id
    const booked = crossEvent ? await bookedTravelTrips(supabase, source.event.id, staffId) : []
    const needs = booked.length > 0
    const placed = await placeStaffInCell(supabase, { staffId, tpId: target.tp.id, slotIndex: target.slotIndex, eventId: target.event.id, status: needs ? 'needs_attention' : 'confirmed' })
    if (placed.error) {
      console.error('move: placing at target failed:', placed.error)
      quickToast(`Could not move: ${placed.error.message || 'target not available'}. Nothing changed.`)
      return false
    }
    const removed = await clearAssignment(source.tp, source.slotIndex, source.event, source.row)
    if (!removed) quickToast('Added at the new event, but could not remove from the original. Please check both.')
    await confirmStaffMember({ supabase, eventId: target.event.id, staffId, confirm: !needs })
    if (removed && crossEvent) await leaveEventTravel(supabase, source.event.id, staffId, moveNote(source.event.city, target.event.city))
    return removed
  }

  // SWAP: exchange the two people between two occupied cells (each keeps their own status).
  // Done in THREE writes so that nobody is ever in two rows at any step (a person is briefly in none, never in two):
  //   1. vacate A's cell   2. A takes B's cell (B leaves it)   3. B takes A's old cell
  // If a step fails, the earlier steps are put back (compensating writes), so the swap is all or nothing as far as the client can make it.
  const swapCells = async (src, tgt) => {
    const supabase = getSupabase()
    const sId = src.row.staff_id, tId = tgt.row.staff_id
    if (!sId || !tId || tgt.row.event_id !== tgt.event.id) {
      quickToast('Those two cells cannot be swapped here. Nothing changed.')
      return false
    }
    const cross = src.event.id !== tgt.event.id
    const bookedA = cross ? await bookedTravelTrips(supabase, src.event.id, sId) : []
    const bookedB = cross ? await bookedTravelTrips(supabase, tgt.event.id, tId) : []
    // each person keeps their own status, except someone who had booked travel on the event they leave: they arrive as Needs Attention
    const tStatus = bookedB.length ? NEEDS : { status: tgt.row.status || 'confirmed', confirmed: !!tgt.row.confirmed } // B's status at A's old cell
    const sStatus = bookedA.length ? NEEDS : { status: src.row.status || 'confirmed', confirmed: !!src.row.confirmed } // A's status at B's old cell
    const srcIsDefault = src.row.event_id !== src.event.id // a tour-wide default row is never emptied; B gets an event-specific row instead
    const setRow = (id, v) => supabase.from('staff_assignments').update(v).eq('id', id)
    const fail = async (restore) => { for (const fn of restore) await fn(); console.error('swap failed'); quickToast('Could not swap. Nothing changed.'); return false }

    if (!srcIsDefault) {
      const r1 = await setRow(src.row.id, { staff_id: null, status: 'pending', confirmed: false })            // 1
      if (r1.error) return fail([])
    }
    const undoStep1 = () => (srcIsDefault ? null : setRow(src.row.id, { staff_id: sId, ...sStatus }))
    const r2 = await setRow(tgt.row.id, { staff_id: sId, ...sStatus })                                          // 2
    if (r2.error) return fail([undoStep1].filter(Boolean).map(f => async () => { await f() }))
    const r3 = srcIsDefault                                                                                      // 3
      ? await supabase.from('staff_assignments').insert([{ tour_position_id: src.tp.id, slot_index: src.slotIndex, event_id: src.event.id, staff_id: tId, ...tStatus }])
      : await setRow(src.row.id, { staff_id: tId, ...tStatus })
    if (r3.error) return fail([async () => { await setRow(tgt.row.id, { staff_id: tId, ...tStatus }) }, ...(srcIsDefault ? [] : [async () => { await setRow(src.row.id, { staff_id: sId, ...sStatus }) }])])

    if (sStatus.confirmed) await confirmStaffMember({ supabase, eventId: tgt.event.id, staffId: sId, confirm: true })
    if (tStatus.confirmed) await confirmStaffMember({ supabase, eventId: src.event.id, staffId: tId, confirm: true })
    if (cross) {
      await leaveEventTravel(supabase, src.event.id, sId, moveNote(src.event.city, tgt.event.city))
      await leaveEventTravel(supabase, tgt.event.id, tId, moveNote(tgt.event.city, src.event.city))
    }
    return true
  }

  // REPLACE: the incoming person takes over the occupied target cell; the source (when there is one) is cleared afterwards.
  // The replaced person is removed from that event (their booked travel is kept and flagged); the incoming person arrives
  // as Needs Attention if THEY had booked travel on the event they leave.
  const replaceCell = async (staffId, source, tgt) => {
    const supabase = getSupabase()
    if (tgt.row.event_id !== tgt.event.id) { quickToast('That assignment is tour-wide and cannot be replaced here. Nothing changed.'); return false }
    const replacedId = tgt.row.staff_id
    const crossEvent = !!source && source.event.id !== tgt.event.id
    const bookedIn = crossEvent ? await bookedTravelTrips(supabase, source.event.id, staffId) : []
    const needs = bookedIn.length > 0
    const { error } = await supabase.from('staff_assignments').update({ staff_id: staffId, ...(needs ? NEEDS : { status: 'confirmed', confirmed: true }) }).eq('id', tgt.row.id)
    if (error) { console.error(error); quickToast('Could not replace. Nothing changed.'); return false }
    if (source) {
      const removed = await clearAssignment(source.tp, source.slotIndex, source.event, source.row)
      if (!removed) quickToast('Replaced, but could not remove from the original. Please check both.')
    }
    await confirmStaffMember({ supabase, eventId: tgt.event.id, staffId, confirm: !needs })
    if (crossEvent) await leaveEventTravel(supabase, source.event.id, staffId, moveNote(source.event.city, tgt.event.city))
    if (replacedId) await leaveEventTravel(supabase, tgt.event.id, replacedId, removeNote(tgt.event.city))
    return true
  }

  // Everyone assigned on an event, as swap candidates (grouped by department in the picker)
  const swapOptionsFor = (otherEvent) => departmentsWithRows.flatMap(dept => dept.rows.map(({ position, slotIndex }) => {
    const info = getCellInfo(position, slotIndex, otherEvent)
    if (info.state !== 'FILLED' || !info.tp) return null
    return {
      key: cellKey(info.tp.id, slotIndex, otherEvent.id),
      dept: dept.name, positionId: position.id, positionTitle: position.title, slotIndex,
      tp: info.tp, row: info.assignment, status: info.assignment.status || 'pending',
      name: staffDisplayName(info.assignment.staff) || 'Staff',
    }
  }).filter(Boolean))

  // Open the swap picker for a source cell and the other event. Preselects the person in the same position when
  // there is exactly one, else the given fallback row; the user can always change the choice.
  const openSwapPicker = (src, otherEvent, fallbackRowId = null, staffNameOverride = null) => {
    const options = swapOptionsFor(otherEvent)
    const samePos = options.filter(o => o.positionId === src.tp.position_id)
    const preselect = samePos.length === 1 ? samePos[0].key : (options.find(o => o.row.id === fallbackRowId)?.key || null)
    setSwapPicker({
      src, otherEvent, options, preselect,
      staffName: staffNameOverride || staffDisplayName(src.row.staff) || 'This person',
      otherCity: otherEvent.city || 'the other event',
      aPosition: positionLabel(positionsById[src.tp.position_id], src.slotIndex), aEvent: eventInfo(src.event), bEvent: eventInfo(otherEvent),
      warningsFor: (opt) => travelWarningsFor(swapTravelPeople(src, { event: otherEvent, row: opt.row })),
    })
  }

  // ── DOUBLE-BOOKING GUARD ───────────────────────────────────────────────────
  // Every write path that puts a person on an event calls this first. It asks the DATABASE (not just the loaded
  // events) using the single rule in lib/staffingRule.js. `ignoreAssignmentIds` = the person's own row being moved.
  const guardOrToast = async (staffId, targetEventId, ignoreAssignmentIds = [], who = '') => {
    const g = await canAssign(staffId, targetEventId, { ignoreAssignmentIds })
    if (!g.ok) {
      quickToast(`${who ? who + ': ' : ''}${endSentence(g.reason || 'Cannot assign')} Nothing changed.`)
      return false
    }
    return true
  }
  const nameOfRow = (row) => staffDisplayName(row?.staff) || 'This person'

  // The swap itself, shared by the drag dialog and the panel's picker. Re-checks everything RIGHT NOW (the data may have changed
  // while a dialog was open): both rows still hold the same two people and neither is locked, then canAssign for both people.
  const performSwap = async (src, tgt) => {
    const supabase = getSupabase()
    const { data: fresh } = await supabase.from('staff_assignments').select('id, staff_id, locked').in('id', [src.row.id, tgt.row.id])
    const a = fresh?.find(r => r.id === src.row.id), b = fresh?.find(r => r.id === tgt.row.id)
    if (a?.locked || b?.locked) { quickToast('One of the slots is locked. Unlock it first. Nothing changed.'); return false }
    if (!a?.staff_id || !b?.staff_id || a.staff_id !== src.row.staff_id || b.staff_id !== tgt.row.staff_id) {
      quickToast('One of the slots changed. Nothing changed.'); reload(); return false
    }
    if (src.event.id !== tgt.event.id) {
      const ignore = [src.row.id, tgt.row.id]
      if (!(await guardOrToast(src.row.staff_id, tgt.event.id, ignore, nameOfRow(src.row)))) return false
      if (!(await guardOrToast(tgt.row.staff_id, src.event.id, ignore, nameOfRow(tgt.row)))) return false
    }
    const ok = await undoable(`Swapped ${nameOfRow(src.row)} and ${nameOfRow(tgt.row)}`, [src.event.id, tgt.event.id], () => swapCells(src, tgt))
    reload()
    return ok
  }

  // Swap confirmation: both people and both events, arrows crossing
  const swapTravelPeople = (src, tgt) => (src.event.id === tgt.event.id ? [] : [
    { name: nameOfRow(src.row), event: src.event, staffId: src.row.staff_id },
    { name: nameOfRow(tgt.row), event: tgt.event, staffId: tgt.row.staff_id },
  ])
  const openSwapDialog = async (src, tgt) => {
    const nameA = nameOfRow(src.row), nameB = nameOfRow(tgt.row)
    const travel = await travelWarningsFor(swapTravelPeople(src, tgt))
    setMoveDialog({
      travel,
      kind: 'swap', title: `Swap ${nameA} and ${nameB}?`, primary: 'Swap',
      a: { name: nameA, position: positionLabel(positionsById[src.tp.position_id], src.slotIndex), event: eventInfo(src.event) },
      b: { name: nameB, position: positionLabel(positionsById[tgt.tp.position_id], tgt.slotIndex), event: eventInfo(tgt.event) },
      locks: [],
      notes: [
        ...(src.event.id !== tgt.event.id ? [`${nameA} goes to ${tgt.event.city} and ${nameB} goes to ${src.event.city}.`] : []),
        ...(travel.length ? [flaggedNote([...new Set([src.event.city, tgt.event.city])].join(' and ')), 'Anyone who leaves booked travel behind arrives as Needs Attention.'] : []),
      ],
      onConfirm: () => performSwap(src, tgt),
    })
  }

  // Move into a LOCKED slot: one dialog with the lock notice. Nothing is unlocked or written until "Unlock and Move" is pressed;
  // then the locked row becomes the person's row in ONE write, and the original is removed afterwards.
  const moveIntoLocked = async (src, tgt) => {
    const supabase = getSupabase()
    const who = nameOfRow(src.row)
    const { data: fresh } = await supabase.from('staff_assignments').select('id, staff_id, locked').eq('id', tgt.row.id).maybeSingle()
    if (!fresh || fresh.staff_id) { quickToast('That slot changed. Nothing changed.'); reload(); return false }
    if (src.event.id !== tgt.event.id && !(await guardOrToast(src.row.staff_id, tgt.event.id, [src.row.id], who))) return false
    return undoable(`Unlocked and moved ${who} to ${tgt.event.city || 'the event'}`, [src.event.id, tgt.event.id], async () => {
      const crossEvent = src.event.id !== tgt.event.id
      const needs = crossEvent && (await bookedTravelTrips(supabase, src.event.id, src.row.staff_id)).length > 0
      const { error } = await supabase.from('staff_assignments').update({ staff_id: src.row.staff_id, ...(needs ? NEEDS : { status: 'confirmed', confirmed: true }), locked: false }).eq('id', tgt.row.id)
      if (error) { console.error(error); quickToast('Could not unlock and move. Nothing changed.'); return false }
      const removed = await clearAssignment(src.tp, src.slotIndex, src.event, src.row)
      if (!removed) quickToast('Moved, but could not remove from the original. Please check both.')
      await confirmStaffMember({ supabase, eventId: tgt.event.id, staffId: src.row.staff_id, confirm: !needs })
      if (removed && crossEvent) await leaveEventTravel(supabase, src.event.id, src.row.staff_id, moveNote(src.event.city, tgt.event.city))
      reload()
      return removed
    })
  }
  const openLockedMoveDialog = async (src, tgt) => {
    const who = nameOfRow(src.row)
    const posT = positionsById[tgt.tp.position_id]
    const travel = src.event.id !== tgt.event.id ? await travelWarningsFor([{ name: who, event: src.event, staffId: src.row.staff_id }]) : []
    setMoveDialog({
      travel,
      kind: 'move', title: `Move ${who} to ${tgt.event.city}?`, primary: 'Unlock and Move',
      from: { name: who, position: positionLabel(positionsById[src.tp.position_id], src.slotIndex), event: eventInfo(src.event) },
      to: { name: who, position: positionLabel(posT, tgt.slotIndex), event: eventInfo(tgt.event) },
      locks: [`${positionLabel(posT, tgt.slotIndex)} on ${tgt.event.city} is locked.`],
      notes: [`Leaves ${positionLabel(positionsById[src.tp.position_id], src.slotIndex)} open on ${src.event.city}.`, ...(travel.length ? [flaggedNote(src.event.city), `${who} arrives as Needs Attention.`] : [])],
      onConfirm: () => moveIntoLocked(src, tgt),
    })
  }

  // The picker (panel > Swap With Someone): choosing the person shows the crossing preview inside the same dialog
  const confirmSwap = async (option) => {
    const { src, otherEvent } = swapPicker
    const ok = await performSwap(src, { tp: option.tp, slotIndex: option.slotIndex, event: otherEvent, row: option.row })
    if (ok) setSwapPicker(null)
  }

  const confirmReplaceFromPicker = async (option) => {
    const { src, otherEvent, staffName } = swapPicker
    const cross = src.event.id !== otherEvent.id
    const run = async () => {
      if (cross && !(await guardOrToast(src.row.staff_id, otherEvent.id, [src.row.id], staffName))) return
      const ok = await undoable(`${staffName} replaced ${option.name}`, [src.event.id, otherEvent.id], () =>
        replaceCell(src.row.staff_id, { tp: src.tp, slotIndex: src.slotIndex, event: src.event, row: src.row },
          { tp: option.tp, slotIndex: option.slotIndex, event: otherEvent, row: option.row }))
      if (ok) setSwapPicker(null)
      reload()
    }
    // the replaced person leaves the event, and so does the incoming person's old assignment
    const travel = await travelWarningsFor([...(cross ? [{ name: staffName, event: src.event, staffId: src.row.staff_id }] : []), { name: option.name, event: otherEvent, staffId: option.row.staff_id }])
    if (!travel.length) { await run(); return }
    setSwapPicker(null)
    setMoveDialog({ kind: 'remove', title: `Replace ${option.name} with ${staffName}?`, primary: 'Replace', travel, locks: [],
      notes: [flaggedNote([...new Set([otherEvent.city, ...(cross ? [src.event.city] : [])])].join(' and ')), `${staffName} arrives as Needs Attention if they leave booked travel behind.`], onConfirm: run })
  }

  // ── REMOVING people from an event (panel Remove, bulk delete, "Keep Here") ─────────────────────────────
  // Booked travel is kept on that event and flagged. When anyone has booked travel, a confirmation lists it first.
  //   items [{ tp, slotIndex, event, assignment }]
  const performRemove = (items, label) => undoable(label, items.map(it => it.event.id), async () => {
    const sb = getSupabase(); let ok = 0, failed = 0
    for (const it of items) {
      const done = await clearAssignment(it.tp, it.slotIndex, it.event, it.assignment)
      if (done) { ok++; await leaveEventTravel(sb, it.event.id, it.assignment.staff_id, removeNote(it.event.city)) } else failed++
    }
    return { ok, failed }
  })
  const requestRemove = async (items, { label, title, after }) => {
    const run = async () => { const res = await performRemove(items, label); reload(); if (after) after(res) }
    const travel = await travelWarningsFor(items.map(it => ({ name: staffDisplayName(it.assignment.staff) || 'Staff', event: it.event, staffId: it.assignment.staff_id })))
    if (!travel.length) { await run(); return }
    const cities = [...new Set(items.map(it => it.event.city))].join(' and ')
    setMoveDialog({ kind: 'remove', title, primary: 'Remove', travel, locks: [], notes: [flaggedNote(cities)], onConfirm: run })
  }

  // The person cannot go to a locked cell, or a position the target tour lacks, or a fully taken position, without a choice
  const openBlockedWizard = ({ incomingStaff, sourceCell, targetEvent, givenTp, reason, targetCity = null, positionTitle = null }) => {
    const position = givenTp ? positionsById[givenTp.position_id] : null
    const dept = position ? departments.find(d => d.id === position.department_id) : null
    const targetTour = targetEvent ? toursById[targetEvent.tour_id] : null
    const ignore = sourceCell ? [sourceCell.row.id] : []
    const guard = () => guardOrToast(incomingStaff.id, targetEvent.id, ignore, incomingStaff.first_name)
    const openCells = []
    departmentsWithRows.forEach(d => d.rows.forEach(({ position: pos, slotIndex }) => {
      const info = getCellInfo(pos, slotIndex, targetEvent)
      if (info.state === 'EMPTY' && info.tp && !info.assignment?.locked) {
        openCells.push({ key: cellKey(info.tp.id, slotIndex, targetEvent.id), dept: d.name, positionTitle: pos.title, slotIndex, tp: info.tp, isOwn: !!position && pos.id === position.id })
      }
    }))
    const finish = () => { setConflictWizard(null); reload() }
    const wiz = {
      mode: 'blocked',
      reason,
      incomingStaff,
      positionTitle: positionTitle || position?.title || 'this position',
      targetCity: targetCity || targetEvent?.city || 'the target event',
      tourName: targetTour?.name,
      departmentName: dept?.name,
      cells: openCells,
      // the position row is shared by all tours; adding it to this tour means giving the tour a 1-slot link to it
      onAddPositionMove: async () => {
        if (!(await guard())) return
        const sb = getSupabase()
        const { data: newTp, error: tpErr } = await sb.from('tour_positions')
          .insert([{ tour_id: targetEvent.tour_id, position_id: givenTp.position_id, quantity_needed: 1 }]).select().single()
        if (tpErr || !newTp) { console.error(tpErr); quickToast('Could not add the position. Nothing changed.'); return }
        setTourPositions(prev => [...prev, newTp])
        const placed = await placeStaffInCell(sb, { staffId: incomingStaff.id, tpId: newTp.id, slotIndex: 1, eventId: targetEvent.id, status: 'confirmed' })
        if (placed.error) {
          console.error(placed.error)
          await sb.from('tour_positions').delete().eq('id', newTp.id) // undo the setup change
          setTourPositions(prev => prev.filter(t => t.id !== newTp.id))
          quickToast('Could not move. The position was not added. Nothing changed.')
          return
        }
        if (sourceCell) {
          const removed = await clearAssignment(sourceCell.tp, sourceCell.slotIndex, sourceCell.event, sourceCell.row)
          if (!removed) quickToast('Moved, but could not remove from the original. Please check both.')
        }
        await confirmStaffMember({ supabase: sb, eventId: targetEvent.id, staffId: incomingStaff.id, confirm: true })
        finish()
      },
      onPickCell: async (cell) => {
        if (!(await guard())) return
        const moved = sourceCell
          ? await moveStaffToCell(incomingStaff.id, sourceCell, { tp: cell.tp, slotIndex: cell.slotIndex, event: targetEvent })
          : (await placeStaffInCell(getSupabase(), { staffId: incomingStaff.id, tpId: cell.tp.id, slotIndex: cell.slotIndex, eventId: targetEvent.id, status: 'confirmed' })).error == null
        if (moved) finish()
      },
    }
    const run = (message, fn) => undoable(message, [targetEvent.id, sourceCell?.event.id], fn)
    const who2 = incomingStaff.first_name
    setConflictWizard({
      ...wiz,
      onAddPositionMove: () => run(`Moved ${who2} to ${targetEvent.city}`, wiz.onAddPositionMove),
      onPickCell: (cell) => run(`Moved ${who2} to ${cell.positionTitle}, ${targetEvent.city}`, () => wiz.onPickCell(cell)),
    })
  }

  // Typing a name into an open tile.
  //   - free that weekend: assigned (Confirmed, with travel rows)
  //   - already on ONE other event the same weekend: a "Move <Name> from A to B?" confirmation (a PULL)
  //   - anything else (same event, several bookings): refused with the reason. Nobody ever ends up double-booked.
  const checkAndAssign = async (incomingStaff, targetTourPositionId, targetSlotIndex, targetEventId, targetCity, positionTitleArg) => {
    const supabase = getSupabase()
    const targetEvent = eventsById[targetEventId] || orderedEvents.find(e => e.id === targetEventId)
    // the target is the same position on the TARGET event's tour (a different tour has its own tour_positions row)
    const givenTp = tourPositionsById[targetTourPositionId]
    const targetTp = targetTpFor(targetTourPositionId, targetEvent)
    const who = staffDisplayName(incomingStaff)

    let existingAtTarget = null
    if (targetTp) {
      const res = await supabase
        .from('staff_assignments')
        .select('id, staff_id, locked')
        .eq('tour_position_id', targetTp.id).eq('slot_index', targetSlotIndex).eq('event_id', targetEventId)
        .maybeSingle()
      existingAtTarget = res.data
    }

    if (!targetTp) {
      openBlockedWizard({ incomingStaff, sourceCell: null, targetEvent, givenTp, targetCity, positionTitle: positionTitleArg, reason: 'missing_position' })
      return
    }
    if (existingAtTarget?.locked) { quickToast('That slot is locked. Unlock it first. Nothing changed.'); reload(); return }
    if (existingAtTarget?.staff_id) { quickToast('Someone was just added to that slot. Nothing changed.'); reload(); return }

    // The real check, against the database
    const g = await canAssign(incomingStaff.id, targetEventId)
    const targetPos = positionsById[targetTp.position_id]
    const targetLabel = positionLabel(targetPos, targetSlotIndex)

    if (!g.ok) {
      const c = g.conflicts?.length === 1 && g.conflicts[0].event_id !== targetEventId ? g.conflicts[0] : null
      if (!c) { quickToast(`${who}: ${endSentence(g.reason || 'Already booked')} Nothing changed.`); return }
      // PULL confirmation
      const srcEv = eventsById[c.event_id] || c.events
      const oldPosTitle = c.tour_positions?.positions?.title || 'their position'
      const oldLabel = c.slot_index > 1 ? `${oldPosTitle} ${c.slot_index}` : oldPosTitle
      const travel = await travelWarningsFor([{ name: who, event: srcEv, staffId: incomingStaff.id }])
      const notes = [`Leaves ${oldLabel} open on ${srcEv.city}.`]
      if (travel.length) notes.push(flaggedNote(srcEv.city), `${who} arrives as Needs Attention.`)
      setMoveDialog({
        kind: 'move', title: `Move ${who} from ${srcEv.city} to ${targetEvent.city}?`, primary: 'Move',
        from: { name: who, position: oldLabel, event: eventInfo(srcEv) },
        to: { name: who, position: targetLabel, event: eventInfo(targetEvent) },
        locks: [], notes, travel,
        onConfirm: async () => {
          // data may have changed while the dialog was open: re-check everything before writing
          const g2 = await canAssign(incomingStaff.id, targetEventId, { ignoreAssignmentIds: [c.id] })
          if (!g2.ok) { quickToast(`${who}: ${endSentence(g2.reason)} Nothing changed.`); return }
          const { data: srcRow } = await supabase.from('staff_assignments').select('id, staff_id').eq('id', c.id).maybeSingle()
          if (!srcRow || srcRow.staff_id !== incomingStaff.id) { quickToast('Their other assignment changed. Nothing changed.'); reload(); return }
          await undoable(`Moved ${who} from ${srcEv.city} to ${targetEvent.city}`, [targetEventId, c.event_id], async () => {
            // target first, original removed only after that succeeded
            const needs = (await bookedTravelTrips(supabase, c.event_id, incomingStaff.id)).length > 0
            const placed = await placeStaffInCell(supabase, { staffId: incomingStaff.id, tpId: targetTp.id, slotIndex: targetSlotIndex, eventId: targetEventId, status: needs ? 'needs_attention' : 'confirmed' })
            if (placed.error) { quickToast(`Could not move: ${placed.error.message || 'cell not available'}. Nothing changed.`); return }
            await confirmStaffMember({ supabase, eventId: targetEventId, staffId: incomingStaff.id, confirm: !needs })
            const del = await supabase.from('staff_assignments').delete().eq('id', c.id)
            if (del.error) { console.error(del.error); quickToast('Added at the new event, but could not remove from the original. Please check both.'); return }
            await leaveEventTravel(supabase, c.event_id, incomingStaff.id, moveNote(srcEv.city, targetEvent.city))
          })
          reload()
        },
      })
      return
    }

    await undoable(`Added ${who} to ${positionTitleArg}, ${targetEvent?.city || targetCity || ''}`, [targetEventId], async () => {
      const placed = await placeStaffInCell(supabase, { staffId: incomingStaff.id, tpId: targetTp.id, slotIndex: targetSlotIndex, eventId: targetEventId, status: 'confirmed' })
      if (placed.error) quickToast(`Could not assign: ${placed.error.message || 'cell not available'}.`)
      else await confirmStaffMember({ supabase, eventId: targetEventId, staffId: incomingStaff.id, confirm: true })
    })
    reload()
  }

  // ── DRAG BETWEEN EVENTS + SIDE PANEL MOVES ─────────────────────────────────

  const srcCellOf = (cell, event) => ({ tp: cell.tp, slotIndex: cell.slotIndex, event, row: cell.assignment })

  const performMove = (personId, srcCell, tgtCell) =>
    undoable(`Moved ${nameOfRow(srcCell.row)} to ${tgtCell.event.city || 'the event'}`, [srcCell.event.id, tgtCell.event.id], async () => {
      const ok = await moveStaffToCell(personId, srcCell, tgtCell)
      reload()
      return ok
    })

  // A move to an empty cell. No dialog when nothing is booked (Undo toast only); a confirmation when the person has booked travel on the
  // event they are leaving. The guard runs again right before writing either way.
  const requestMove = async (src, tgt) => {
    const who = nameOfRow(src.row)
    const cross = src.event.id !== tgt.event.id
    const run = async () => {
      if (cross && !(await guardOrToast(src.row.staff_id, tgt.event.id, [src.row.id], who))) return
      await performMove(src.row.staff_id, src, tgt)
    }
    const travel = cross ? await travelWarningsFor([{ name: who, event: src.event, staffId: src.row.staff_id }]) : []
    if (!travel.length) { await run(); return }
    const posS = positionLabel(positionsById[src.tp.position_id], src.slotIndex)
    setMoveDialog({
      kind: 'move', title: `Move ${who} to ${tgt.event.city}?`, primary: 'Move', travel,
      from: { name: who, position: posS, event: eventInfo(src.event) },
      to: { name: who, position: positionLabel(positionsById[tgt.tp.position_id], tgt.slotIndex), event: eventInfo(tgt.event) },
      locks: [], notes: [`Leaves ${posS} open on ${src.event.city}.`, flaggedNote(src.event.city), `${who} arrives as Needs Attention.`],
      onConfirm: run,
    })
  }

  // Move to another event "in general": same position if one is open and unlocked, else the matching choice step
  const moveToEventBody = async (srcCell, personId, targetEvent) => {
    if (targetEvent.id === srcCell.event.id) return
    if (!(await guardOrToast(personId, targetEvent.id, [srcCell.row.id], nameOfRow(srcCell.row)))) return
    const incomingStaff = srcCell.row.staff
    const position = positionsById[srcCell.tp.position_id]
    const tgtTp = targetTpFor(srcCell.tp.id, targetEvent)
    if (!tgtTp) { openBlockedWizard({ incomingStaff, sourceCell: srcCell, targetEvent, givenTp: srcCell.tp, reason: 'missing_position' }); return }
    let lockedRow = null
    for (const dept of departmentsWithRows) {
      for (const { position: pos, slotIndex } of dept.rows) {
        if (pos.id !== position.id) continue
        const info = getCellInfo(pos, slotIndex, targetEvent)
        if (info.state === 'EMPTY' && info.tp && !info.assignment?.locked) {
          await requestMove(srcCell, { tp: info.tp, slotIndex, event: targetEvent })
          return
        }
        if (info.state === 'LOCKED' && !lockedRow) lockedRow = { tp: info.tp, slotIndex, row: info.assignment }
      }
    }
    // every open slot of that position is locked: one dialog with the lock notice
    if (lockedRow) { openLockedMoveDialog(srcCell, { tp: lockedRow.tp, slotIndex: lockedRow.slotIndex, event: targetEvent, row: lockedRow.row }); return }
    openBlockedWizard({ incomingStaff, sourceCell: srcCell, targetEvent, givenTp: srcCell.tp, reason: 'occupied' })
  }

  const startDrag = (cell, event, e) => {
    const src = srcCellOf(cell, event)
    const personId = cell.assignment.staff_id
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', cell.assignment.id) } catch {}
    // Dragging is limited to the SAME WEEKEND (other weekends are done from the side panel or the name search).
    // Nothing is queried on dragover; canAssign decides at write time.
    const d = { src, personId, weekend: getWeekendGroup(event.load_in_date) }
    dragRef.current = d
    setDrag(d)
  }
  const endDrag = () => { dragRef.current = null; setDrag(null); setDragOverEvent(null); setDropHover(null); setStrayWeekend(false) }
  const inDragWeekend = (ev, d = drag) => !!d && getWeekendGroup(ev.load_in_date) === d.weekend

  // This person's bookings among the events loaded here (for the instant hint only; canAssign checks the database at write time)
  const loadedBookingsFor = (personId) => assignments
    .filter(a => a.staff_id === personId && a.event_id && eventsById[a.event_id])
    .map(a => ({ id: a.id, event_id: a.event_id, events: eventsById[a.event_id] }))

  // What dropping on this (same-weekend) cell would do. 'blocked' (red) only where the drop is truly impossible.
  const hintFor = (cell, ev, d) => {
    if (cell.state === 'LOCKED') return { kind: 'move', label: 'Unlock and Move Here' }
    if (cell.state === 'EMPTY') return { kind: 'move', label: 'Move Here' }
    const other = cell.assignment
    if (ev.id !== d.src.event.id && other?.staff_id) {
      // a swap also moves the other person, to the source event: impossible if THEY are booked elsewhere that weekend
      const c = findOverlaps({ targetEvent: d.src.event, assignments: loadedBookingsFor(other.staff_id), ignoreAssignmentIds: [d.src.row.id, other.id] })
      if (c.length) return { kind: 'blocked', label: `${staffDisplayName(other.staff)}: ${overlapReason(c)}`, soft: true }
    }
    return { kind: 'swap', label: `Swap With ${staffDisplayName(other?.staff) || 'Staff'}` }
  }

  const dropOnOpenCell = async (tgt) => {
    const d = dragRef.current; endDrag()
    if (!d) return
    const { src } = d
    if (src.event.id === tgt.event.id) {
      await undoable(`Moved ${nameOfRow(src.row)}`, [src.event.id], () =>
        doMoveStaff({ tp: src.tp, slotIndex: src.slotIndex, event: src.event, assignment: src.row }, { tp: tgt.tp, slotIndex: tgt.slotIndex, event: tgt.event }))
      reload()
      return
    }
    await requestMove(src, { tp: tgt.tp, slotIndex: tgt.slotIndex, event: tgt.event })
  }

  const dropOnPerson = async (tgt) => {
    const d = dragRef.current; endDrag()
    if (!d || tgt.row.id === d.src.row.id) return
    openSwapDialog(d.src, { tp: tgt.tp, slotIndex: tgt.slotIndex, event: tgt.event, row: tgt.row })
  }

  const dropOnLocked = async (tgt) => {
    const d = dragRef.current; endDrag()
    if (!d) return
    openLockedMoveDialog(d.src, { tp: tgt.tp, slotIndex: tgt.slotIndex, event: tgt.event, row: tgt.row })
  }

  const dropOnEventTile = async (ev) => {
    const d = dragRef.current; endDrag()
    if (!d) return
    await moveToEventBody(d.src, d.personId, ev)
  }

  // Side panel
  const openPanel = (cell, ev) => {
    const key = cell.assignment.id
    setPanel({ tpId: cell.tp.id, slotIndex: cell.slotIndex, eventId: ev.id, rowId: key, blocked: {}, loadingBlocked: true })
    fetchBookings(cell.assignment.staff_id).then(b => {
      setPanel(p => (p && p.rowId === key) ? { ...p, blocked: blockedEventsFor(b, events, { ignoreAssignmentIds: [key], exceptEventId: ev.id }), loadingBlocked: false } : p)
    }).catch(() => setPanel(p => (p && p.rowId === key) ? { ...p, loadingBlocked: false } : p))
  }

  // Remove a quantity-0 position row once no unlocked cells remain on it (it only existed to hold them)
  const dropEmptyTourPosition = async (supabase, tp) => {
    if (!tp || tp.quantity_needed !== 0) return
    const { data: remaining } = await supabase.from('staff_assignments').select('id').eq('tour_position_id', tp.id).limit(1)
    if (!remaining || remaining.length === 0) {
      await supabase.from('tour_positions').delete().eq('id', tp.id)
      setTourPositions(prev => prev.filter(t => t.id !== tp.id))
    }
  }

  // EXTRA SLOT: add an empty slot beyond the tour's quantity at ONE event. No person is placed here, so the
  // double-booking rule is not involved; whoever is added next goes through checkAndAssign (which runs canAssign).
  const addExtraSlot = async (tp, slotIndex, event, position) => {
    const supabase = getSupabase()
    const tempId = `tmp-${++tmpSeq.current}`
    const row = { tour_position_id: tp.id, slot_index: slotIndex, staff_id: null, event_id: event.id, status: 'pending', confirmed: false }
    setAssignments(prev => [...prev, { id: tempId, ...row }])
    const { data, error } = await supabase.from('staff_assignments').insert([row]).select().single()
    if (error || !data) {
      console.error('addExtraSlot failed:', error)
      setAssignments(prev => prev.filter(a => a.id !== tempId))
      quickToast('Could not add the slot. Reverted.')
      return
    }
    setAssignments(prev => prev.map(a => a.id === tempId ? data : a))
  }

  // From the toolbar's "+ Slots" panel: one empty extra slot for a position at an event
  const addSlotFromPanel = async (position, ev) => {
    const tp = tpByPosTour[position.id]?.[ev.tour_id]
    if (!tp) { quickToast('That tour does not have this position. Nothing changed.'); return false }
    const used = assignments.filter(a => a.tour_position_id === tp.id && a.event_id === ev.id).map(a => a.slot_index)
    const nextSlot = Math.max(tp.quantity_needed, ...used) + 1
    await undoable(`Added an extra ${position.title} slot at ${ev.city}`, [ev.id], () => addExtraSlot(tp, nextSlot, ev, position))
    reload()
    return true
  }

  // Remove an EMPTY extra slot (a filled one has to be emptied first; only empty extras show the x)
  const removeExtraSlot = async (tp, slotIndex, ev) => {
    await undoable(`Removed an extra ${positionsById[tp.position_id]?.title || ''} slot at ${ev.city}`, [ev.id], () => lockCell(tp, slotIndex, ev))
    reload()
  }

  // LOCK an empty cell. Never touches staff (only empty cells offer it). Optimistic; reverts with a toast.
  //  - slot beyond the tour-wide quantity: remove its empty event-specific row (cell returns to hatched/locked)
  //  - slot within the baseline: store a locked row (locked = true, no staff). If an empty event-specific
  //    row already exists it is updated in place (the table allows one row per position/slot/event).
  const lockCell = async (tp, slotIndex, event) => {
    const supabase = getSupabase()
    const own = assignments.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && a.event_id === event.id)
    if (own && (own.staff_id || own.locked || String(own.id).startsWith('tmp-'))) return
    const beyondBaseline = slotIndex > tp.quantity_needed

    if (beyondBaseline) {
      if (!own) return
      setAssignments(prev => prev.filter(a => a.id !== own.id))
      const { error } = await supabase.from('staff_assignments').delete().eq('id', own.id)
      if (error) {
        console.error('lockCell failed:', error)
        setAssignments(prev => [...prev, own])
        quickToast('Could not lock the cell. Reverted.')
        return
      }
      await dropEmptyTourPosition(supabase, tp)
      return
    }

    if (own) {
      setAssignments(prev => prev.map(a => a.id === own.id ? { ...a, locked: true } : a))
      const { error } = await supabase.from('staff_assignments').update({ locked: true }).eq('id', own.id)
      if (error) {
        console.error('lockCell failed:', error)
        setAssignments(prev => prev.map(a => a.id === own.id ? { ...a, locked: false } : a))
        quickToast('Could not lock the cell. Reverted.')
      }
      return
    }

    const tempId = `tmp-${++tmpSeq.current}`
    const row = { tour_position_id: tp.id, slot_index: slotIndex, staff_id: null, event_id: event.id, status: 'pending', confirmed: false, locked: true }
    setAssignments(prev => [...prev, { id: tempId, ...row }])
    const { data, error } = await supabase.from('staff_assignments').insert([row]).select().single()
    if (error || !data) {
      console.error('lockCell failed:', error)
      setAssignments(prev => prev.filter(a => a.id !== tempId))
      quickToast('Could not lock the cell. Reverted.')
      return
    }
    setAssignments(prev => prev.map(a => a.id === tempId ? data : a))
  }

  // UNLOCK a locked cell (row with locked = true). The locked row is deleted, leaving no empty row behind,
  // unless a tour-wide default assignee exists for this slot: then the row is kept as an empty override
  // (locked = false) so that default person does not reappear on this event.
  const unlockLocked = async (tp, slotIndex, event) => {
    const supabase = getSupabase()
    const row = assignments.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && a.event_id === event.id && a.locked)
    if (!row || String(row.id).startsWith('tmp-')) return
    const hasDefaultStaff = slotIndex <= tp.quantity_needed &&
      !!assignments.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && !a.event_id && a.staff_id)

    if (hasDefaultStaff) {
      setAssignments(prev => prev.map(a => a.id === row.id ? { ...a, locked: false } : a))
      const { error } = await supabase.from('staff_assignments').update({ locked: false }).eq('id', row.id)
      if (error) {
        console.error('unlockLocked failed:', error)
        setAssignments(prev => prev.map(a => a.id === row.id ? { ...a, locked: true } : a))
        quickToast('Could not unlock the cell. Reverted.')
      }
      return
    }

    setAssignments(prev => prev.filter(a => a.id !== row.id))
    const { error } = await supabase.from('staff_assignments').delete().eq('id', row.id)
    if (error) {
      console.error('unlockLocked failed:', error)
      setAssignments(prev => [...prev, row])
      quickToast('Could not unlock the cell. Reverted.')
      return
    }
    await dropEmptyTourPosition(supabase, tp)
  }

  const doMoveStaff = async (source, target) => {
    // write the new placement first; only remove the original once it landed
    const res = await doAssign(target.tp, target.slotIndex, target.event, source.assignment.staff)
    if (res && res.error) {
      console.error('doMoveStaff failed:', res.error)
      quickToast('Could not move the person. Nothing changed.')
      return
    }
    await clearAssignment(source.tp, source.slotIndex, source.event, source.assignment)
  }

  // ── SELECTION + BULK ACTIONS ─────────────────────────────────────────────
  // Handlers read the current selection and assignments through refs so they never act on a stale render.

  const exitSelectMode = () => { setSelectMode(false); setSelectedKeys(new Set()); selectAnchor.current = null }

  // Only occupied cells are selectable (locked/empty never are). Returns the cell key or null.
  const selectableKey = (position, slotIndex, ev) => {
    const info = getCellInfo(position, slotIndex, ev)
    return info.state === 'FILLED' && info.tp ? cellKey(info.tp.id, slotIndex, ev.id) : null
  }

  const rowIndexOf = (position, slotIndex) => visiblePositionRows.findIndex(r => r.position.id === position.id && r.slotIndex === slotIndex)

  const handleSelectClick = (position, slotIndex, ev, shift) => {
    const r = rowIndexOf(position, slotIndex)
    const c = filteredEvents.findIndex(e => e.id === ev.id)
    const key = selectableKey(position, slotIndex, ev)
    if (!key) return
    const anchor = selectAnchor.current
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (shift && anchor && (anchor.r === r || anchor.c === c)) {
        const keys = []
        if (anchor.r === r) {
          const [lo, hi] = anchor.c < c ? [anchor.c, c] : [c, anchor.c]
          for (let i = lo; i <= hi; i++) { const k = selectableKey(position, slotIndex, filteredEvents[i]); if (k) keys.push(k) }
        } else {
          const [lo, hi] = anchor.r < r ? [anchor.r, r] : [r, anchor.r]
          for (let i = lo; i <= hi; i++) { const row = visiblePositionRows[i]; const k = row && selectableKey(row.position, row.slotIndex, ev); if (k) keys.push(k) }
        }
        keys.forEach(k => next.add(k))
      } else if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    selectAnchor.current = { r, c }
  }

  // "Select all" affordances: toggle every occupied cell of one event column / one position row
  const toggleKeys = (keys) => {
    if (keys.length === 0) return
    setSelectedKeys(prev => {
      const next = new Set(prev)
      const allIn = keys.every(k => next.has(k))
      keys.forEach(k => allIn ? next.delete(k) : next.add(k))
      return next
    })
  }
  const selectAllInEvent = (ev) => toggleKeys(visiblePositionRows.map(r => selectableKey(r.position, r.slotIndex, ev)).filter(Boolean))

  // Resolve the current selection to live, occupied cells
  const collectSelected = () => {
    const out = []
    for (const key of selectedKeysRef.current) {
      const [tpId, slotStr, eventId] = key.split('__')
      const tp = tourPositionsById[tpId]
      const event = eventsById[eventId]
      const position = tp && positions.find(p => p.id === tp.position_id)
      if (!tp || !event || !position) continue
      const info = getCellInfo(position, Number(slotStr), event)
      if (info.state !== 'FILLED' || !info.assignment?.staff_id) continue
      out.push({ key, tp, event, position, slotIndex: Number(slotStr), assignment: info.assignment })
    }
    return out
  }

  const bulkSetStatus = async (status) => {
    const items = collectSelected()
    if (items.length === 0) return
    setBulkBusy(true)
    let ok = 0, failed = 0
    // same path as a single status change, so Confirmed creates arrival/departure rows and others flag them
    await undoable(`Status changed on ${items.length}`, items.map(it => it.event.id), async () => {
      for (const it of items) {
        const done = await applyStatusChange(it.tp, it.slotIndex, it.event, it.assignment, status)
        done ? ok++ : failed++
      }
    })
    setBulkBusy(false)
    setSelectedKeys(new Set())
    if (failed) quickToast(`Status updated on ${ok}, ${failed} failed`)
    reload()
  }

  const bulkDelete = async () => {
    const items = collectSelected()
    if (items.length === 0) return
    setBulkBusy(true)
    await requestRemove(items, {
      label: `Removed ${items.length} assignment${items.length === 1 ? '' : 's'}`,
      title: `Remove ${items.length} assignment${items.length === 1 ? '' : 's'}?`,
      after: ({ ok, failed }) => { setSelectedKeys(new Set()); if (failed) quickToast(`Removed ${ok}, ${failed} failed`) },
    })
    setBulkBusy(false)
    setSelectedKeys(new Set())
  }

  const openBulkCopy = () => {
    const items = collectSelected()
    if (items.length === 0) return
    setBulkCopy(items.map(it => ({
      key: it.key,
      positionId: it.position.id,
      positionTitle: it.position.title,
      slotIndex: it.slotIndex,
      staffId: it.assignment.staff_id,
      staffName: staffDisplayName(it.assignment.staff) || 'Staff',
      status: it.assignment.status || 'pending',
      confirmed: !!it.assignment.confirmed,
      sourceEventId: it.event.id,
      sourceTourId: it.event.tour_id,
    })))
  }

  // ── CONFLICT MODAL ───────────────────────────────────────────────────────

  const handleConflictClick = (tp, slotIndex, event, assignment, conflictBooking) => {
    const currentTour = toursById[event.tour_id]
    setConflictModal({
      staffId: assignment.staff_id,
      staffName: staffDisplayName(assignment.staff),
      current: {
        tp, slotIndex, event, eventId: event.id,
        city: event.city, tourName: currentTour?.name,
        weekendLabel: fmtWeekend(getWeekendGroup(event.load_in_date)),
        position: positionsById[tp.position_id]?.title,
      },
      conflict: {
        tourPositionId: conflictBooking.tour_position_id, slotIndex: conflictBooking.slot_index, eventId: conflictBooking.event_id,
        city: conflictBooking.city, tourName: conflictBooking.tour_name,
        weekendLabel: fmtWeekend(getWeekendGroup(conflictBooking.load_in_date)),
        position: conflictBooking.position,
      },
    })
  }

  const handleKeepHere = async (side) => {
    let item = null
    if (side === 'current') {
      const c = conflictModal.conflict
      const tp = tourPositionsById[c.tourPositionId], event = eventsById[c.eventId]
      const resolved = resolveAssignment(c.tourPositionId, c.slotIndex, c.eventId)
      if (tp && event && resolved) item = { tp, slotIndex: c.slotIndex, event, assignment: resolved }
    } else {
      const c = conflictModal.current
      const resolved = resolveAssignment(c.tp.id, c.slotIndex, c.eventId)
      if (resolved) item = { tp: c.tp, slotIndex: c.slotIndex, event: c.event, assignment: resolved }
    }
    setConflictModal(null)
    if (item) await requestRemove([item], { label: `Removed ${staffDisplayName(item.assignment.staff)} from ${item.event.city}`, title: `Remove ${staffDisplayName(item.assignment.staff)} from ${item.event.city}?` })
  }

  // keep refs current for bulk handlers
  useEffect(() => { selectedKeysRef.current = selectedKeys; assignmentsRef.current = assignments })

  // Escape leaves selection mode (unless the copy modal is open; it handles its own Escape)
  useEffect(() => {
    if (!selectMode || bulkCopy) return
    const onKey = (e) => { if (e.key === 'Escape') { setSelectMode(false); setSelectedKeys(new Set()); selectAnchor.current = null } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectMode, bulkCopy])

  // keep dragRef current and close the "type a name" box on an outside click
  useEffect(() => { dragRef.current = drag })
  useEffect(() => {
    if (!activeCell) return
    const onDown = (e) => { if (!e.target.closest?.('[data-assigning]')) setActiveCell(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [activeCell])

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: 28, color: 'var(--text-secondary)', fontSize: 16 }}>Loading staffing grid...</div>
  }

  if (tourId && tourPositions.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 17, color: 'var(--text-primary)' }}>No positions configured for this tour.</div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Set up staffing in Edit Tour → Tour Staffing.</div>
        <button className="btn-primary" onClick={() => router.push(`/tours/${tourId}/edit`)}>Go to Edit Tour</button>
      </div>
    )
  }

  if (departments.length === 0 || positions.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 17, color: 'var(--text-primary)' }}>No positions configured.</div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Set up departments and positions in Staffing Settings.</div>
        <button className="btn-primary" onClick={() => router.push('/staff/settings')}>Go to Staffing Settings</button>
      </div>
    )
  }

  // "Incomplete Staff" only ever means UPCOMING events (a past event with empty slots is not a to-do)
  const visibleEvents = filteredEvents.filter(ev => filterMode === 'all' || (!isPastEvent(ev) && eventModels[ev.id]?.attention))
  const attentionCount = filteredEvents.filter(ev => !isPastEvent(ev) && eventModels[ev.id]?.attention).length
  const groups = []
  visibleEvents.forEach(ev => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date || 'none'
    let g = groups.find(x => x.wk === wk)
    if (!g) { g = { wk, events: [] }; groups.push(g) }
    g.events.push(ev)
  })
  const board = buildBoard(visibleEvents)
  // People who left an event with booked travel that needs rework, listed under the event they left
  const reworkPerEvent = Object.fromEntries(visibleEvents.map(ev => [ev.id, ghostsByEvent[ev.id] || []]).filter(([, g]) => g.length))
  const reworkSection = Object.keys(reworkPerEvent).length ? { name: 'Travel Needs Rework', label: 'Left The Event', perEvent: reworkPerEvent } : null
  const renderGhost = (g, ev) => {
    const note = g.rows[0]?.rework_note
    return <GhostTile key={g.staffId} name={staffDisplayName(g.staff) || 'Staff'} reason={`Travel Needs Rework${note ? `: ${note}` : ''}`} onClick={() => setReworkFor({ staffId: g.staffId, eventId: ev.id })} />
  }
  // "+ Slots": pick an event first, then any position that event's tour has
  const deptOrder = Object.fromEntries(departments.map(d => [d.id, d.sort_order ?? 0]))
  const positionsForEvent = (eventId) => {
    const ev = eventsById[eventId]
    if (!ev) return []
    return positions
      .filter(p => !!tpByPosTour[p.id]?.[ev.tour_id])
      .sort((a, b) => ((deptOrder[a.department_id] ?? 0) - (deptOrder[b.department_id] ?? 0)) || ((a.sort_order ?? 0) - (b.sort_order ?? 0)))
      .map(p => ({ id: p.id, title: p.title, department: departments.find(d => d.id === p.department_id)?.name }))
  }

  // Drop targets for one cell tile while a drag is in progress, plus the highlight state for the cell under the pointer
  const cellDnd = (ev, cell) => {
    if (!drag) return {}
    const isSource = cell.assignment?.id === drag.src.row.id
    if (isSource) return {}
    // another weekend: NOT a drop target. No highlight, "not allowed" cursor; releasing there shows a one-line hint.
    if (!inDragWeekend(ev)) return {
      onDragEnter: () => setStrayWeekend(true),
      onDragOver: (e) => { if (e.dataTransfer) e.dataTransfer.dropEffect = 'none' },
    }
    return {
      onDragEnter: () => { setStrayWeekend(false); setDropHover(cell.key) },
      onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHover(prev => (prev === cell.key ? null : prev)) },
      onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move' },
      onDrop: (e) => {
        e.preventDefault(); e.stopPropagation()
        const tgt = { tp: cell.tp, slotIndex: cell.slotIndex, event: ev, position: cell.position, row: cell.assignment }
        if (cell.state === 'EMPTY') dropOnOpenCell(tgt)
        else if (cell.state === 'FILLED') dropOnPerson(tgt)
        else dropOnLocked(tgt)
      },
    }
  }

  const renderCell = (cell, ev) => {
    const a = cell.assignment
    const conflictBooking = cell.state === 'FILLED' ? conflictBookingFor(a, ev) : null
    const assigning = !!activeCell && activeCell.eventId === ev.id && activeCell.positionId === cell.position.id && activeCell.slotIndex === cell.slotIndex
    return (
      <StaffTile
        key={cell.key}
        cell={cell}
        editable
        selectMode={selectMode}
        selected={selectedKeys.has(cell.key)}
        draggable={!isPhone}
        rework={cell.state === 'FILLED' ? reworkTooltip(a?.staff_id) : null}
        onReworkClick={() => setReworkFor({ staffId: a?.staff_id, eventId: null })}
        dragging={!!drag && !!a && drag.src.row.id === a.id}
        dropState={drag && dropHover === cell.key && inDragWeekend(ev) && !(cell.assignment && drag.src.row.id === cell.assignment.id) ? hintFor(cell, ev, drag) : null}
        onRemoveSlot={cell.extra && cell.state === 'EMPTY' ? () => removeExtraSlot(cell.tp, cell.slotIndex, ev) : undefined}
        hasConflict={!!conflictBooking}
        isOverride={cell.isOverride}
        assigning={assigning}
        renderSearch={() => (
          <div data-assigning="">
            <InlineStaffSearch
              eventId={ev.id} onClose={() => setActiveCell(null)} initialValue=""
              checkAndAssign={checkAndAssign}
              tourPositionId={cell.tp.id} slotIndex={cell.slotIndex} eventCity={ev.city} positionTitle={cell.position.title}
            />
          </div>
        )}
        onStartAssign={() => setActiveCell({ positionId: cell.position.id, slotIndex: cell.slotIndex, eventId: ev.id })}
        onOpenPanel={() => openPanel(cell, ev)}
        onSetStatus={async (status) => { await changeStatus(cell.tp, cell.slotIndex, ev, a, status) }}
        onLock={() => lockCell(cell.tp, cell.slotIndex, ev)}
        onUnlock={() => unlockLocked(cell.tp, cell.slotIndex, ev)}
        onToggleSelect={(shift) => handleSelectClick(cell.position, cell.slotIndex, ev, shift)}
        onConflictClick={() => conflictBooking && handleConflictClick(cell.tp, cell.slotIndex, ev, a, conflictBooking)}
        onDragStart={(e) => startDrag(cell, ev, e)}
        onDragEnd={() => {
          // released over a cell in another weekend: say how to do that instead
          if (dragRef.current && strayWeekend) quickToast('Dragging works within one weekend. Use Move in the side panel for other weekends.', 'info')
          endDrag()
        }}
        {...cellDnd(ev, cell)}
      />
    )
  }

  // the person shown in the side panel (looked up live so it follows status changes; closes if they leave)
  // drag/drop wiring shared by an event's header and body
  const eventDropProps = (ev) => {
    const target = inDragWeekend(ev)
    return {
      dragging: !!drag && target,                       // other weekends get no highlight at all
      blockedReason: null,
      dragOver: dragOverEvent === ev.id,
      hintLabel: 'Move to This Event',
      onDragEnter: () => { if (!drag) return; if (target) { setStrayWeekend(false); setDragOverEvent(ev.id) } else setStrayWeekend(true) },
      onDragLeave: (e) => { if (drag && !e.currentTarget.contains(e.relatedTarget)) setDragOverEvent(prev => (prev === ev.id ? null : prev)) },
      onDragOver: (e) => {
        if (!drag || !target) { if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'; return }
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'
      },
      onDrop: (e) => { if (!drag || !target) return; e.preventDefault(); dropOnEventTile(ev) },
    }
  }

  // Dropping on empty space inside a cell = move into THIS row's position at this event (first open slot); same weekend only
  const cellDropProps = (ev, row) => !drag ? {} : !inDragWeekend(ev) ? { onDragEnter: () => setStrayWeekend(true), onDragOver: (e) => { if (e.dataTransfer) e.dataTransfer.dropEffect = 'none' } } : {
    onDragEnter: () => setStrayWeekend(false),
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
    onDrop: (e) => {
      e.preventDefault()
      const cells = row?.perEvent[ev.id] || []
      const open = cells.find(c => c.state === 'EMPTY')
      if (open) dropOnOpenCell({ tp: open.tp, slotIndex: open.slotIndex, event: ev, position: open.position, row: open.assignment })
      else {
        const locked = cells.find(c => c.state === 'LOCKED')
        const d = dragRef.current; endDrag()
        if (locked && d) openLockedMoveDialog(d.src, { tp: locked.tp, slotIndex: locked.slotIndex, event: ev, row: locked.assignment })
        else quickToast(`No open ${row?.position.title || 'slot'} at ${ev.city}. Drop on a person to swap. Nothing changed.`)
      }
    },
  }

  let panelCell = null
  if (panel) {
    const ptp = tourPositionsById[panel.tpId]
    const pev = eventsById[panel.eventId]
    const ppos = ptp && positionsById[ptp.position_id]
    const info = ptp && pev && ppos ? getCellInfo(ppos, panel.slotIndex, pev) : null
    if (info && info.state === 'FILLED') panelCell = { tp: ptp, event: pev, position: ppos, slotIndex: panel.slotIndex, assignment: info.assignment }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, boxSizing: 'border-box', background: 'var(--staff-view-bg)', borderRadius: 'var(--tile-radius)', padding: VIEW_PAD }}>

      {/* Pinned area: toolbar, legend (phones: legend scrolls away), selection bar. Only the staff tiles scroll vertically. */}
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
        <div role="group" aria-label="Filter Events" style={{ display: 'flex', gap: 4, border: '0.5px solid var(--border-default)', borderRadius: 8, padding: 3, background: 'var(--surface-card)' }}>
          {[['all', 'All Events'], ['attention', `Incomplete Staff (${attentionCount})`]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setFilterMode(val)} aria-pressed={filterMode === val}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: filterMode === val ? 700 : 500, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: filterMode === val ? 'color-mix(in srgb, var(--color-info) 14%, transparent)' : 'transparent', color: filterMode === val ? 'var(--color-info)' : 'var(--text-secondary)' }}>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          aria-pressed={selectMode}
          style={{
            fontFamily: 'inherit', fontSize: 13, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: selectMode ? 'none' : '0.5px solid var(--border-default)',
            background: selectMode ? '#FFD60A' : 'transparent',
            color: selectMode ? '#0a1628' : 'var(--text-secondary)',
            fontWeight: selectMode ? 700 : 500,
          }}
        ><IconChecklist size={16} /> {selectMode ? 'Done Selecting' : 'Select'}</button>
        <button type="button" onClick={() => setSlotsOpen(true)} disabled={selectMode}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: selectMode ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', opacity: selectMode ? 0.5 : 1 }}>
          <IconPlus size={15} /> Slots
        </button>
        <button type="button" onClick={togglePast} aria-pressed={showPast}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: showPast ? 700 : 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', border: showPast ? '1px solid var(--color-info)' : '0.5px solid var(--border-default)', background: showPast ? 'color-mix(in srgb, var(--color-info) 14%, transparent)' : 'transparent', color: showPast ? 'var(--color-info)' : 'var(--text-primary)' }}>
          {showPast ? 'Hide Past Events' : 'Show Past Events'}
        </button>
        {selectMode && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {selectedKeys.size > 0 ? `${selectedKeys.size} selected` : 'Tap staff tiles to select. Shift-click selects a range. Esc to exit.'}
          </span>
        )}
      </div>

      {!isPhone && <div style={{ flexShrink: 0 }}><StaffLegend /></div>}

      {selectMode && selectedKeys.size > 0 && (
        <SelectionBar inline count={selectedKeys.size} busy={bulkBusy} onSetStatus={bulkSetStatus} onDelete={bulkDelete} onCopy={openBulkCopy} onExit={exitSelectMode} />
      )}

      {/* The board: positions down the left, events across. The top area is pinned; the body scrolls beneath it. */}
      <StaffingBoard
        extraSection={reworkSection} renderExtra={renderGhost}
        groups={groups} board={board} models={eventModels} toursById={toursById}
        renderCell={renderCell}
        eventDropProps={eventDropProps} cellDropProps={cellDropProps} isBlocked={(ev) => !!drag && !inDragWeekend(ev)}
        selectMode={selectMode} onSelectAllInEvent={selectAllInEvent}
        collapsed={collapsed} onToggleDept={(id) => setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
        scrollRef={scrollRef} stripRef={stripRef}
        onScrollDragOver={(e) => {
          // auto-scroll while dragging near the edges (below the pinned strip for vertical)
          if (!drag) return
          const el = scrollRef.current; if (!el) return
          const r = el.getBoundingClientRect()
          const top = r.top + (stripRef.current?.offsetHeight || 0)
          const EDGE = 56, STEP = 18
          if (e.clientY < top + EDGE) el.scrollTop -= STEP
          else if (e.clientY > r.bottom - EDGE) el.scrollTop += STEP
          if (e.clientX < r.left + EDGE) el.scrollLeft -= STEP
          else if (e.clientX > r.right - EDGE) el.scrollLeft += STEP
        }}
        emptyText={filterMode === 'attention' ? 'No upcoming events have incomplete staffing.' : (showPast ? 'No events to show.' : 'No upcoming events. Use Show Past Events to see earlier ones.')}
      />

      {panelCell && (
        <StaffPanel
          panel={panelCell}
          events={visibleEvents.length ? events : events}
          toursById={toursById}
          blocked={panel.blocked}
          loadingBlocked={panel.loadingBlocked}
          onClose={() => setPanel(null)}
          onSetStatus={(status) => changeStatus(panelCell.tp, panelCell.slotIndex, panelCell.event, panelCell.assignment, status)}
          onMoveTo={async (ev) => { const src = srcCellOf(panelCell, panelCell.event); setPanel(null); await moveToEventBody(src, panelCell.assignment.staff_id, ev) }}
          onSwapAt={(ev) => { const src = srcCellOf(panelCell, panelCell.event); setPanel(null); openSwapPicker(src, ev, null, staffDisplayName(panelCell.assignment.staff)) }}
          onCopy={() => {
            const c = panelCell
            setPanel(null)
            setBulkCopy([{
              key: c.assignment.id, positionId: c.position.id, positionTitle: c.position.title, slotIndex: c.slotIndex,
              staffId: c.assignment.staff_id, staffName: staffDisplayName(c.assignment.staff) || 'Staff',
              status: c.assignment.status || 'pending', confirmed: !!c.assignment.confirmed,
              sourceEventId: c.event.id, sourceTourId: c.event.tour_id,
            }])
          }}
          onRemove={async () => {
            const c = panelCell
            setPanel(null)
            await requestRemove([{ tp: c.tp, slotIndex: c.slotIndex, event: c.event, assignment: c.assignment }], {
              label: `Removed ${staffDisplayName(c.assignment.staff)} from ${c.event.city}`,
              title: `Remove ${staffDisplayName(c.assignment.staff)} from ${c.event.city}?`,
              after: ({ failed }) => { if (failed) quickToast('Could not remove. Nothing changed.') },
            })
          }}
          reworkGroups={reworkGroupsFor(panelCell.assignment.staff_id)}
          onResolveRework={resolveRework}
          onDeleteRework={deleteRework}
        />
      )}

      {slotsOpen && (
        <SlotsPanel
          toursById={toursById}
          events={visibleEvents}
          positionsFor={positionsForEvent}
          onClose={() => setSlotsOpen(false)}
          onAdd={(eventId, positionId) => addSlotFromPanel(positionsById[positionId], eventsById[eventId])}
        />
      )}

      {bulkCopy && (
        <BulkCopyModal
          cells={bulkCopy}
          events={events}
          tours={tours}
          tpByPosTour={tpByPosTour}
          getInfo={(positionId, slot, ev) => getCellInfo(positions.find(p => p.id === positionId), slot, ev)}
          onClose={() => setBulkCopy(null)}
          undoable={undoable}
          onDone={({ copied, skipped }) => {
            setBulkCopy(null)
            setSelectedKeys(new Set())
            if (copied === 0 && skipped > 0) quickToast(`Copied 0, skipped ${skipped}`, 'info')
            else if (skipped > 0) quickToast(`Copied ${copied}, skipped ${skipped}`, 'info')
            reload()
          }}
        />
      )}

      {undoToastElement}

      {toast && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: Z_TOAST, background: '#33FF99', color: '#0a1628', borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
          ✓ {toast}
        </div>,
        document.body
      )}

      {conflictModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
          <div style={{ background: 'var(--surface-card)', border: '1.5px solid rgba(255,214,10,0.35)', borderRadius: 'var(--tile-radius)', padding: 32, width: 560, maxWidth: '95vw' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFD60A', marginBottom: 6 }}>
              Scheduling Conflict — {conflictModal.staffName}
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {conflictModal.staffName} is assigned to two events on the same weekend. Choose which event to keep them on.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[{ side: 'current', ev: conflictModal.current }, { side: 'conflict', ev: conflictModal.conflict }].map(({ side, ev }) => (
                <div key={side} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ev.tourName && <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#FFD60A' }}>{ev.tourName}</div>}
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.city || '—'}</div>
                  {ev.weekendLabel && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{ev.weekendLabel}</div>}
                  {ev.position && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{ev.position}</div>}
                  <button
                    onClick={() => handleKeepHere(side)}
                    style={{ fontFamily: 'inherit', marginTop: 'auto', fontSize: 15, padding: '8px 14px', borderRadius: 7, border: 'none', background: '#33FF99', color: '#0a1628', cursor: 'pointer', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2be88a'}
                    onMouseLeave={e => e.currentTarget.style.background = '#33FF99'}
                  >Keep Here</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setConflictModal(null)} style={{ fontFamily: 'inherit', fontSize: 15, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--border-stronger)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {moveDialog && <MoveDialog dialog={moveDialog} onClose={() => setMoveDialog(null)} />}
      {reworkFor && (() => {
        const groups = reworkGroupsFor(reworkFor.staffId, reworkFor.eventId)
        const person = reworkByStaff[reworkFor.staffId]?.[0]?.staff
        return <ReworkPanel name={staffDisplayName(person) || 'Staff'} groups={groups} onResolve={resolveRework} onDelete={deleteRework} onClose={() => setReworkFor(null)} />
      })()}
      {swapPicker && <SwapPickerModal picker={swapPicker} onClose={() => setSwapPicker(null)} onConfirm={confirmSwap} onReplace={confirmReplaceFromPicker} />}
      <ConflictWizardModal
        wizard={conflictWizard}
        onClose={() => setConflictWizard(null)}
      />
    </div>
  )
}
