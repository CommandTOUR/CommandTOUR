'use client'

// The shared layout for both staffing views (presentation only, no data access, no writes).
//   Positions run down the left, grouped by department; events run across.
//
// COLUMN GEOMETRY: ONE array of columns (event columns + fixed spacers) drives everything. The pinned header and
// every body row are CSS grids with the SAME `grid-template-columns` built from that array, so a column can never
// be wider or narrower in one than in the other. Every width is a constant: nothing depends on content, and the
// "Weekend of ..." label is an overlay that spans columns without sizing any of them.
//
// SCROLL: one scroll container (both axes). The header strip is `position: sticky; top: 0` inside it; the label
// column is `position: sticky; left: 0`. No second scroller, no scroll listeners.
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import EventHeader from './EventTile'
import { LABEL_W, COL_W, EVENT_GAP, WEEKEND_GAP, WEEKEND_LABEL_H, STRIP_PAD_BOTTOM, CELL_PAD, CELL_GAP, ROW_DIVIDER } from './shared'
import { fmtWeekend } from './weekend'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const VIEW_BG = 'var(--staff-view-bg)'

// The single source of truth for the columns after the label column.
//   cols    [{ kind: 'gap', w } | { kind: 'event', w, ev }]  (a leading gap, gaps inside a weekend, wider gaps between weekends)
//   weekends [{ wk, start, span }]   start/span are indexes into `cols` (the label spans its events and the gap after them)
export function buildColumns(groups) {
  const cols = [{ kind: 'gap', w: EVENT_GAP }]
  const weekends = []
  groups.forEach((g, gi) => {
    if (gi > 0) cols.push({ kind: 'gap', w: WEEKEND_GAP })
    const start = cols.length
    g.events.forEach((ev, i) => {
      if (i > 0) cols.push({ kind: 'gap', w: EVENT_GAP })
      cols.push({ kind: 'event', w: COL_W, ev })
    })
    weekends.push({ wk: g.wk, start, span: cols.length - start + (gi < groups.length - 1 ? 1 : 0) })
  })
  const template = `${LABEL_W}px ${cols.map(c => `${c.w}px`).join(' ')}`
  const totalW = LABEL_W + cols.reduce((sum, c) => sum + c.w, 0)
  return { cols, weekends, template, totalW }
}

//   groups        [{ wk, events }]            visible events grouped by weekend
//   board         from useStaffingData().buildBoard(events)
//   models        eventModels (N/M confirmed per event)
//   renderCell    (cell, ev) => node          one staff tile
//   renderCellFooter  (row, ev, cells) => node   optional (editable board: the "add slot" button)
//   eventDropProps  (ev) => props             drag/drop wiring for the header (editable board only)
//   cellDropProps   (ev, row) => props        drop wiring for an event's cells in a position row
//   isBlocked     (ev) => bool                dim a column while a drag cannot go there
export default function StaffingBoard({
  groups, board, models, toursById, renderCell, renderCellFooter, extraSection, renderExtra, eventDropProps, cellDropProps, isBlocked,
  selectMode, onSelectAllInEvent, collapsed, onToggleDept, scrollRef, stripRef, onScrollDragOver, emptyText,
}) {
  const { cols, weekends, template, totalW } = buildColumns(groups)
  const grid = { display: 'grid', gridTemplateColumns: template, width: '100%', minWidth: totalW }

  return (
    <div data-staff-scroll="" ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative', fontFamily: FONT }} onDragOver={onScrollDragOver}>
      {groups.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-primary)', fontSize: 16 }}>{emptyText || 'No events to show.'}</div>
      ) : (
        <div style={{ width: '100%', minWidth: totalW, display: 'flex', flexDirection: 'column' }}>
          {/* PINNED TOP AREA: opaque, so nothing from the body shows above or behind it */}
          <div data-strip="" ref={stripRef} style={{ position: 'sticky', top: 0, zIndex: 20, background: VIEW_BG, paddingBottom: STRIP_PAD_BOTTOM }}>
            <div style={{ ...grid, gridTemplateRows: `${WEEKEND_LABEL_H}px auto` }}>
              {/* empty spacer over the label column (sticky left, covers anything scrolling under it) */}
              <div style={{ gridColumn: 1, gridRow: '1 / span 2', position: 'sticky', left: 0, zIndex: 30, background: VIEW_BG }} />
              {/* weekend labels: anchored to the first event column, span the following columns, never size them */}
              {weekends.map(w => (
                <div key={w.wk} title={w.wk === 'none' ? 'No date' : `Weekend of ${fmtWeekend(w.wk)}`}
                  style={{ gridColumn: `${w.start + 2} / span ${w.span}`, gridRow: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                    {w.wk === 'none' ? 'No date' : `Weekend of ${fmtWeekend(w.wk)}`}
                  </span>
                </div>
              ))}
              {cols.map((c, i) => c.kind !== 'event' ? null : (
                <div key={c.ev.id} style={{ gridColumn: i + 2, gridRow: 2, minWidth: 0 }}>
                  <EventHeader event={c.ev} tour={toursById[c.ev.tour_id]} model={models[c.ev.id]}
                    selectMode={selectMode} onSelectAll={() => onSelectAllInEvent && onSelectAllInEvent(c.ev)}
                    {...(eventDropProps ? eventDropProps(c.ev) : {})} />
                </div>
              ))}
            </div>
          </div>

          {/* BODY: department sections, one grid row per position, the same columns as the header */}
          {board.length === 0 && <div style={{ padding: 20, color: 'var(--text-primary)', fontSize: 15 }}>No positions set up.</div>}
          {board.map(dept => {
            const isCollapsed = collapsed.has(dept.id)
            return (
              <div key={dept.id}>
                {/* section header bar: spans the full scrollable width; the label sticks to the left */}
                <div style={{ width: '100%', minWidth: totalW, boxSizing: 'border-box', background: 'color-mix(in srgb, var(--color-info) 10%, var(--staff-view-bg))', borderTop: ROW_DIVIDER, borderBottom: ROW_DIVIDER }}>
                  <button type="button" onClick={() => onToggleDept(dept.id)} aria-expanded={!isCollapsed}
                    style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)' }}>
                    {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
                    {dept.name}
                  </button>
                </div>
                {!isCollapsed && dept.positions.map(row => (
                  <div key={row.position.id} data-row="" style={{ ...grid, borderBottom: ROW_DIVIDER }}>
                    <div title={row.position.title} style={{ gridColumn: 1, position: 'sticky', left: 0, zIndex: 5, boxSizing: 'border-box', background: VIEW_BG, padding: '6px 8px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--text-primary)', borderRight: ROW_DIVIDER }}>
                      {row.position.title}
                    </div>
                    {cols.map((c, i) => {
                      if (c.kind !== 'event') return <div key={i} style={{ gridColumn: i + 2 }} aria-hidden="true" />
                      const ev = c.ev
                      const cells = row.perEvent[ev.id] || []
                      const blocked = isBlocked ? isBlocked(ev) : false
                      return (
                        <div key={ev.id} data-cell={ev.id} data-drop-allowed={isBlocked ? String(!blocked) : undefined} {...(cellDropProps && cells.length ? cellDropProps(ev, row) : {})}
                          style={{
                            gridColumn: i + 2, minWidth: 0, boxSizing: 'border-box', padding: `${CELL_PAD}px 0`, display: 'flex', flexDirection: 'column', gap: CELL_GAP,
                            opacity: blocked ? 0.4 : 1, transition: 'opacity 0.12s', cursor: blocked ? 'not-allowed' : undefined,
                            background: cells.length ? 'transparent' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                          }}>
                          {cells.map(cell => renderCell(cell, ev))}
                          {renderCellFooter && cells.length > 0 ? renderCellFooter(row, ev, cells) : null}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
          {/* Extra section: people who left an event with booked travel that needs rework (listed under the event they left) */}
          {extraSection && (
            <div data-extra-section="">
              <div style={{ width: '100%', minWidth: totalW, boxSizing: 'border-box', background: 'color-mix(in srgb, var(--color-danger) 10%, var(--staff-view-bg))', borderTop: ROW_DIVIDER, borderBottom: ROW_DIVIDER }}>
                <span style={{ position: 'sticky', left: 0, display: 'inline-block', padding: '4px 8px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)' }}>{extraSection.name}</span>
              </div>
              <div style={{ ...grid, borderBottom: ROW_DIVIDER }}>
                <div style={{ gridColumn: 1, position: 'sticky', left: 0, zIndex: 5, boxSizing: 'border-box', background: VIEW_BG, padding: '6px 8px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: 'var(--text-primary)', borderRight: ROW_DIVIDER }}>{extraSection.label}</div>
                {cols.map((c, i) => {
                  if (c.kind !== 'event') return <div key={i} style={{ gridColumn: i + 2 }} aria-hidden="true" />
                  const items = extraSection.perEvent[c.ev.id] || []
                  return (
                    <div key={c.ev.id} data-extra-cell={c.ev.id} style={{ gridColumn: i + 2, minWidth: 0, boxSizing: 'border-box', padding: `${CELL_PAD}px 0`, display: 'flex', flexDirection: 'column', gap: CELL_GAP }}>
                      {items.map(it => renderExtra(it, c.ev))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  )
}
