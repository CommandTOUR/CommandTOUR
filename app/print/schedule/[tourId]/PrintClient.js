'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './print.css'

const STATUS_COLORS = {
  'Confirmed':  '#33FF99',
  '1-Hold':     '#FFD60A',
  '2-Hold':     '#FF9F0A',
  '3-Hold':     '#FF375F',
  'Tentative':  '#BF5AF2',
  'Date Hold':  '#AEAEB2',
}

function formatLocationCompact(city, state, country) {
  // North America (US/CA): City, ST
  if (country === 'United States' || country === 'Canada' || country === 'US' || country === 'CA') {
    if (state) return `${city}, ${state}`
    return city
  }
  // International: City, Country
  if (city && country) return `${city}, ${country}`
  return city || country || ''
}

const DEFAULT_COLUMNS = [
  { id: 'date',     label: '#',        defaultOn: true,  render: (_, i) => i + 1 },
  { id: 'date_val', label: 'Date',     defaultOn: true,  render: (e) => e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
  { id: 'location', label: 'Location', defaultOn: true,  render: (e) => formatLocationCompact(e.city, e.state, e.country) },
  { id: 'venue',    label: 'Venue',    defaultOn: true,  render: (e) => e.venue_name || '—' },
  { id: 'status',   label: 'Status',   defaultOn: true,  render: (e) => e.status || '—' },
  { id: 'shows',    label: 'Shows',    defaultOn: false, render: (e) => e.show_count ?? '—' },
  { id: 'notes',    label: 'Notes',    defaultOn: false, render: (e) => e.notes || '' },
]

function SortableColItem({ col, enabled, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="col-item">
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <label>
        <input type="checkbox" checked={enabled} onChange={() => onToggle(col.id)} />
        {col.label}
      </label>
    </div>
  )
}

export default function PrintClient({ tour, events }) {
  const [columnOrder, setColumnOrder] = useState(() => DEFAULT_COLUMNS.map(c => c.id))
  const [enabledCols, setEnabledCols] = useState(
    () => DEFAULT_COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: c.defaultOn }), {})
  )
  const [density, setDensity] = useState('normal')
  const [orientation, setOrientation] = useState('portrait')
  const [scale, setScale] = useState(90)
  const iframeRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setColumnOrder((prev) => {
      const oldIndex = prev.indexOf(active.id)
      const newIndex = prev.indexOf(over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const toggleCol = useCallback((id) => {
    setEnabledCols((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const orderedCols = columnOrder.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean)
  const activeCols = orderedCols.filter(c => enabledCols[c.id])
  const tourColor = tour?.color || '#10E687'
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'print-orientation'
    style.textContent = `@page { size: ${orientation}; margin: 12mm; }`
    const existing = document.getElementById('print-orientation')
    if (existing) existing.remove()
    document.head.appendChild(style)
    return () => document.getElementById('print-orientation')?.remove()
  }, [orientation])

  return (
    <div className="print-app" data-orientation={orientation}>

      {/* LEFT SIDEBAR — hidden on print */}
      <aside className="print-sidebar no-print">
        <div className="sidebar-section">
          <h3>Columns</h3>
          <p className="sidebar-hint">Drag to reorder</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              {orderedCols.map(col => (
                <SortableColItem key={col.id} col={col} enabled={enabledCols[col.id]} onToggle={toggleCol} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="sidebar-section">
          <h3>Row Density</h3>
          <div className="toggle-group">
            <button className={density === 'compact' ? 'active' : ''} onClick={() => setDensity('compact')}>Compact</button>
            <button className={density === 'normal' ? 'active' : ''} onClick={() => setDensity('normal')}>Normal</button>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Orientation</h3>
          <div className="toggle-group">
            <button className={orientation === 'portrait' ? 'active' : ''} onClick={() => setOrientation('portrait')}>Portrait</button>
            <button className={orientation === 'landscape' ? 'active' : ''} onClick={() => setOrientation('landscape')}>Landscape</button>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Scale <span className="scale-val">{scale}%</span></h3>
          <input type="range" min="65" max="100" value={scale} onChange={e => setScale(Number(e.target.value))} className="scale-slider" />
        </div>

        <div className="sidebar-footer">
          <button className="print-btn" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </aside>

      {/* RIGHT — DOCUMENT PREVIEW */}
      <main className="print-preview-area no-print-wrapper">
        <div
          className={`print-document density-${density}`}
          style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}
          id="print-document"
        >
          {/* DOCUMENT HEADER */}
          <div className="doc-header">
            <div className="doc-header-left">
              <div className="doc-tour-name">{tour?.name || 'Tour'}</div>
              <div className="doc-show-type">{tour?.tour_type || ''}</div>
              <div className="doc-region-year">
                {[tour?.region, tour?.year].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="doc-header-right">
              <div className="doc-stat">
                <span className="doc-stat-label">Shows</span>
                <span className="doc-stat-value">{events.length}</span>
              </div>
              <div className="doc-generated">Generated {generatedDate}</div>
              <div className="doc-branding">Powered by CommandTOUR</div>
            </div>
          </div>

          {/* FULL-WIDTH TOUR-COLOR DELINEATOR */}
          <div className="doc-delineator" style={{ backgroundColor: tourColor }} />

          {/* TABLE */}
          <table className="schedule-table">
            <thead>
              <tr style={{ backgroundColor: tourColor }}>
                {activeCols.map(col => (
                  <th key={col.id}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={event.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  {activeCols.map(col => (
                    <td
                      key={col.id}
                      className={col.id === 'status' ? 'status-cell' : ''}
                      style={col.id === 'status' ? {
                        color: STATUS_COLORS[event.status] || '#666',
                        fontWeight: 700,
                      } : {}}
                    >
                      {col.render(event, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

    </div>
  )
}
