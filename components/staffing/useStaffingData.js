'use client'

// Loads and derives everything the staffing views draw. READ ONLY: this file never writes to the database.
// The editable board (components/StaffingGrid.js) and the view-only board (components/StaffingOverview.js) both use it.
import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { staffDisplayName } from './shared'
import { TRAVEL_TABLES } from '@/lib/travelRework'
import { toYMD, getWeekendGroup, getWeekendDates, isPastEvent } from './weekend'

export const cellKey = (tpId, slotIndex, eventId) => tpId + '__' + slotIndex + '__' + eventId

//   tourId  limit to one tour        year  load events whose load-in falls in that year (null = every year, tour tab only)
export default function useStaffingData({ tourId, year, showPastEvents = false, searchQuery = '' }) {
  const effectiveYear = year || (tourId ? null : new Date().getFullYear())

  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [tourPositions, setTourPositions] = useState([])
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [reworkRows, setReworkRows] = useState([]) // flagged travel rows: [{ dir, r }] (r.staff = the person)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = getSupabase()
      const today = toYMD(new Date())

      let tpQuery = supabase.from('tour_positions').select('id, tour_id, position_id, quantity_needed')
      if (tourId) tpQuery = tpQuery.eq('tour_id', tourId)

      // Events by load-in date within the selected year (any tour, or just this tour); past ones only when asked for
      let eventsQuery = supabase.from('events')
        .select('id, city, state, country, venue_name, venue_id, load_in_date, load_out_date, tour_id, status')
        .is('deleted_at', null)
        .order('load_in_date', { ascending: true })
      if (tourId) eventsQuery = eventsQuery.eq('tour_id', tourId)
      if (effectiveYear) eventsQuery = eventsQuery.gte('load_in_date', `${effectiveYear}-01-01`).lte('load_in_date', `${effectiveYear}-12-31`)
      if (!showPastEvents) {
        // coarse filter in the query (a weekend event can still be running 3 days after its load-in); the exact end-date test is below
        const back = new Date(); back.setDate(back.getDate() - 3)
        eventsQuery = eventsQuery.or(`load_out_date.gte.${today},load_in_date.gte.${toYMD(back)}`)
      }

      const [deptRes, posRes, tpRes, toursRes, eventsRes] = await Promise.all([
        supabase.from('departments').select('id, name, sort_order').order('sort_order', { ascending: true }),
        supabase.from('positions').select('id, title, sort_order, department_id').order('sort_order', { ascending: true }),
        tpQuery,
        supabase.from('tours').select('id, name, color, status, sort_order').order('sort_order', { ascending: true, nullsFirst: false }),
        eventsQuery,
      ])

      setDepartments(deptRes.data || [])
      setPositions(posRes.data || [])
      setTourPositions(tpRes.data || [])
      setTours(toursRes.data || [])
      setEvents((eventsRes.data || []).filter(ev => showPastEvents || !isPastEvent(ev, today)))

      // travel rows flagged "needs rework" (people who were moved / swapped / pulled / removed with booked travel).
      // If the needs_rework column does not exist yet the query errors and there is simply nothing flagged.
      const shownEventIds = (eventsRes.data || []).filter(ev => showPastEvents || !isPastEvent(ev, today)).map(e => e.id)
      const flagged = []
      if (shownEventIds.length) {
        for (const dir of ['arrivals', 'departures']) {
          const { data, error } = await supabase.from(TRAVEL_TABLES[dir]).select('*, staff:staff_id(id, first_name, last_name, display_name)').in('event_id', shownEventIds).eq('needs_rework', true)
          if (!error) (data || []).forEach(r => flagged.push({ dir, r }))
        }
      }
      setReworkRows(flagged)

      const tpIds = (tpRes.data || []).map(tp => tp.id)
      if (tpIds.length === 0) {
        setAssignments([])
        setLoading(false)
        return
      }

      let assignmentsData = []
      let assignmentsFrom = 0
      const ASSIGNMENTS_PAGE_SIZE = 1000
      while (true) {
        const { data: page, error: pageError } = await supabase
          .from('staff_assignments')
          .select(`
            id,
            tour_position_id,
            slot_index,
            staff_id,
            event_id,
            status,
            confirmed,
            locked,
            notes,
            travel_in_date,
            travel_out_date,
            staff:staff(id, first_name, last_name, display_name)
          `)
          .in('tour_position_id', tpIds)
          .range(assignmentsFrom, assignmentsFrom + ASSIGNMENTS_PAGE_SIZE - 1)
        if (pageError || !page || page.length === 0) break
        assignmentsData = [...assignmentsData, ...page]
        if (page.length < ASSIGNMENTS_PAGE_SIZE) break
        assignmentsFrom += ASSIGNMENTS_PAGE_SIZE
      }

      setAssignments(assignmentsData || [])
      setLoading(false)
    }
    fetchAll()
  }, [tourId, effectiveYear, showPastEvents, reloadKey])

  // ── DERIVED LOOKUP MAPS ─────────────────────────────────────────────────

  const departmentsSorted = useMemo(() => [...departments].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [departments])
  const positionsById = useMemo(() => Object.fromEntries(positions.map(p => [p.id, p])), [positions])
  const toursById = useMemo(() => Object.fromEntries(tours.map(t => [t.id, t])), [tours])
  const eventsById = useMemo(() => Object.fromEntries(events.map(e => [e.id, e])), [events])
  const tourPositionsById = useMemo(() => Object.fromEntries(tourPositions.map(tp => [tp.id, tp])), [tourPositions])

  const filteredTourPositions = useMemo(() => {
    if (tourId) return tourPositions
    const toursWithEventsThisYear = new Set(events.map(ev => ev.tour_id))
    return tourPositions.filter(tp => toursWithEventsThisYear.has(tp.tour_id))
  }, [tourPositions, events, tourId])

  const tpByPosTour = useMemo(() => {
    const m = {}
    for (const tp of filteredTourPositions) {
      if (!m[tp.position_id]) m[tp.position_id] = {}
      m[tp.position_id][tp.tour_id] = tp
    }
    return m
  }, [filteredTourPositions])

  const assignmentIndex = useMemo(() => {
    const m = {}
    for (const a of assignments) {
      m[a.tour_position_id + '__' + a.slot_index + '__' + (a.event_id || 'default')] = a
    }
    return m
  }, [assignments])

  const resolveAssignment = (tpId, slotIndex, eventId) =>
    assignmentIndex[tpId + '__' + slotIndex + '__' + eventId] || assignmentIndex[tpId + '__' + slotIndex + '__default'] || null

  // Slots per position: the tour's quantity, or more where an event has an extra slot (a row beyond the quantity)
  const maxSlotsForPosition = (position) => {
    let maxSlots = 0
    if (tourId) {
      const tp = tpByPosTour[position.id]?.[tourId]
      maxSlots = tp ? tp.quantity_needed : 0
    } else {
      for (const tp of filteredTourPositions) { if (tp.position_id === position.id) maxSlots = Math.max(maxSlots, tp.quantity_needed) }
    }
    const exceptionMaxSlot = assignments
      .filter(a => {
        if (a.event_id === null || !eventsById[a.event_id]) return false
        const tp = tourPositionsById[a.tour_position_id]
        return tp?.position_id === position.id
      })
      .reduce((max, a) => Math.max(max, a.slot_index), 0)
    return Math.max(maxSlots, exceptionMaxSlot)
  }

  const departmentsWithRows = useMemo(() => {
    return departmentsSorted.map(dept => {
      const deptPositions = positions.filter(p => p.department_id === dept.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const rows = []
      deptPositions.forEach(pos => {
        const max = maxSlotsForPosition(pos)
        for (let i = 1; i <= max; i++) rows.push({ position: pos, slotIndex: i })
      })
      return { ...dept, rows }
    }).filter(d => d.rows.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsSorted, positions, filteredTourPositions, tourId, assignments, eventsById, tourPositionsById])

  // FULLY_LOCKED: the event's tour has no such position. HATCHED: slot beyond the tour's quantity with no row (no extra slot there).
  const getCellInfo = (position, slotIndex, event) => {
    const tp = tpByPosTour[position.id]?.[event.tour_id]
    if (!tp) return { state: 'FULLY_LOCKED', tp: null, assignment: null, canRelock: false }
    const withinCapacity = slotIndex <= tp.quantity_needed
    const eventRow = assignmentIndex[tp.id + '__' + slotIndex + '__' + event.id] || null
    // An event-specific row with locked = true is a lock, never an assignment
    if (eventRow && eventRow.locked) return { state: 'LOCKED', tp, assignment: eventRow, canRelock: false }
    if (!withinCapacity && !eventRow) return { state: 'HATCHED', tp, assignment: null, canRelock: false }
    const defaultRow = withinCapacity ? (assignmentIndex[tp.id + '__' + slotIndex + '__default'] || null) : null
    const assignment = eventRow || defaultRow
    // an event-specific row sitting on top of a tour-wide default is an override
    if (assignment && assignment.staff_id) return { state: 'FILLED', tp, assignment, canRelock: false, isOverride: !!(eventRow && defaultRow) }
    return { state: 'EMPTY', tp, assignment, canRelock: !withinCapacity && !!eventRow }
  }

  // Events in weekend order (tour sort order within a weekend)
  const orderedEvents = (() => {
    const weekendMap = {}
    const weekendOrder = []
    events.forEach(ev => {
      const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
      if (!weekendMap[wk]) { weekendMap[wk] = []; weekendOrder.push(wk) }
      weekendMap[wk].push(ev)
    })
    weekendOrder.sort()
    return weekendOrder.flatMap(wk => [...weekendMap[wk]].sort((a, b) => (toursById[a.tour_id]?.sort_order ?? 999) - (toursById[b.tour_id]?.sort_order ?? 999)))
  })()

  const q = searchQuery.toLowerCase().trim()
  const isStaffSearch = q !== '' && orderedEvents.every(ev => {
    const tour = toursById[ev.tour_id]
    return ![ev.city, ev.state, ev.country, ev.venue_name, ev.load_in_date, ev.load_out_date, tour?.name]
      .some(val => val && val.toLowerCase().includes(q))
  })
  const filteredEvents = q === '' ? orderedEvents : isStaffSearch ? orderedEvents.filter(ev =>
    departmentsWithRows.some(dept => dept.rows.some(({ position, slotIndex }) => {
      const info = getCellInfo(position, slotIndex, ev)
      if (!info?.assignment?.staff_id || !info.assignment.event_id) return false
      return staffDisplayName(info.assignment.staff).toLowerCase().includes(q)
    }))
  ) : orderedEvents.filter(ev => {
    const tour = toursById[ev.tour_id]
    return [ev.city, ev.state, ev.country, ev.venue_name, ev.load_in_date, ev.load_out_date, tour?.name]
      .some(val => val && val.toLowerCase().includes(q))
  })

  // staff_id -> [{ event_id, city, load_in_date, load_out_date, saturday_date, sunday_date, tour_name, position,
  //   tour_position_id, slot_index, travel_in_date, travel_out_date }]  (for the double-booked markers; the write guard asks the database instead)
  const bookingsByStaff = useMemo(() => {
    const map = {}
    departmentsWithRows.forEach(dept => {
      dept.rows.forEach(({ position, slotIndex }) => {
        orderedEvents.forEach(event => {
          const info = getCellInfo(position, slotIndex, event)
          if (info.state !== 'FILLED') return
          const { assignment } = info
          const tour = toursById[event.tour_id]
          const { saturday_date, sunday_date } = getWeekendDates(event.load_in_date)
          const list = map[assignment.staff_id] || (map[assignment.staff_id] = [])
          list.push({
            event_id: event.id, city: event.city, load_in_date: event.load_in_date, load_out_date: event.load_out_date,
            saturday_date, sunday_date, tour_name: tour?.name, position: position.title,
            tour_position_id: info.tp.id, slot_index: slotIndex,
            travel_in_date: assignment.travel_in_date, travel_out_date: assignment.travel_out_date,
          })
        })
      })
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsWithRows, orderedEvents, tpByPosTour, assignmentIndex, toursById])

  // The other booking in the same weekend, if any (drives the double-booked marker)
  const conflictBookingFor = (assignment, ev) => {
    const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(ev.load_in_date)
    return (bookingsByStaff[assignment.staff_id] || []).find(b =>
      b.event_id !== ev.id &&
      ((evSat && b.saturday_date && b.saturday_date === evSat) || (evSun && b.sunday_date && b.sunday_date === evSun))
    )
  }

  const visiblePositionRows = departmentsWithRows.flatMap(dept => dept.rows.map(r => ({ ...r, deptId: dept.id })))

  // Flagged travel: people with booked travel rows needing rework. "Ghosts" are people no longer on that event (listed under it);
  // reworkByStaff drives the marker on the tile of someone who is now on another event.
  const reworkByStaff = useMemo(() => {
    const m = {}
    for (const { dir, r } of reworkRows) {
      const list = m[r.staff_id] || (m[r.staff_id] = [])
      let g = list.find(x => x.eventId === r.event_id)
      if (!g) { g = { eventId: r.event_id, staffId: r.staff_id, staff: r.staff, rows: [] }; list.push(g) }
      g.rows.push({ dir, r })
    }
    return m
  }, [reworkRows])
  const ghostsByEvent = useMemo(() => {
    const onEvent = new Set(assignments.filter(a => a.staff_id && a.event_id).map(a => a.event_id + '|' + a.staff_id))
    const m = {}
    for (const groups of Object.values(reworkByStaff)) for (const g of groups) {
      if (onEvent.has(g.eventId + '|' + g.staffId)) continue
      ;(m[g.eventId] || (m[g.eventId] = [])).push(g)
    }
    return m
  }, [reworkByStaff, assignments])

  // Per event: N/M confirmed, open count, needs-attention flag (locked cells are in neither number)
  const modelsKey = filteredEvents.map(e => e.id).join(',')
  const eventModels = useMemo(() => {
    const out = {}
    for (const ev of filteredEvents) {
      let total = 0, confirmed = 0, open = 0, attention = false
      for (const dept of departmentsWithRows) {
        for (const { position, slotIndex } of dept.rows) {
          const info = getCellInfo(position, slotIndex, ev)
          if (!info.tp) continue
          if (info.state === 'FILLED') {
            total++
            if (info.assignment.status === 'confirmed') confirmed++
            else if (info.assignment.status === 'pending' || info.assignment.status === 'needs_attention') attention = true
          } else if (info.state === 'EMPTY') { total++; open++; attention = true }
        }
      }
      const ghosts = (ghostsByEvent[ev.id] || []).length
      if (ghosts) attention = true // someone no longer on this event still has travel to rework
      out[ev.id] = { total, confirmed, open, attention, ghosts }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsKey, assignments, tourPositions, departmentsWithRows, positions, ghostsByEvent])

  // Positions down the left (grouped by department), events across. One cell = a position at an event: its slots, in order.
  //   [{ id, name, positions: [{ position, perEvent: { [eventId]: [cell] } }] }]   cell = { key, state, position, slotIndex, tp, assignment, isOverride }
  const buildBoard = (visibleEvents) => {
    const out = []
    for (const dept of departmentsWithRows) {
      const byPos = []
      for (const { position, slotIndex } of dept.rows) {
        let entry = byPos[byPos.length - 1]
        if (!entry || entry.position.id !== position.id) { entry = { position, slots: [] }; byPos.push(entry) }
        entry.slots.push(slotIndex)
      }
      const posRows = []
      for (const entry of byPos) {
        const perEvent = {}
        let any = false
        for (const ev of visibleEvents) {
          const cells = []
          for (const slotIndex of entry.slots) {
            const info = getCellInfo(entry.position, slotIndex, ev)
            if ((info.state !== 'FILLED' && info.state !== 'EMPTY' && info.state !== 'LOCKED') || !info.tp) continue
            cells.push({ key: cellKey(info.tp.id, slotIndex, ev.id), state: info.state, position: entry.position, slotIndex, tp: info.tp, assignment: info.assignment, isOverride: !!info.isOverride, extra: slotIndex > info.tp.quantity_needed })
          }
          perEvent[ev.id] = cells
          if (cells.length) any = true
        }
        if (any) posRows.push({ position: entry.position, perEvent })
      }
      if (posRows.length) out.push({ id: dept.id, name: dept.name, positions: posRows })
    }
    return out
  }

  return {
    loading, effectiveYear, reload,
    departments, positions, tourPositions, setTourPositions, tours, events, assignments, setAssignments,
    positionsById, toursById, eventsById, tourPositionsById, tpByPosTour, assignmentIndex, resolveAssignment,
    departmentsWithRows, getCellInfo, orderedEvents, filteredEvents, bookingsByStaff, conflictBookingFor,
    visiblePositionRows, eventModels, buildBoard, reworkRows, reworkByStaff, ghostsByEvent,
  }
}
