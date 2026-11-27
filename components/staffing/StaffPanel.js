'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconArrowsExchange, IconCopy, IconTrash, IconSwitchHorizontal, IconBan } from '@tabler/icons-react'
import { STATUS_OPTIONS, fmtEventRange, staffDisplayName } from './shared'
import { formatLocation } from '@/lib/locationFormat'
import { ReworkList } from './ReworkPanel'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const sectionTitle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', marginBottom: 6 }
const rowBtn = { width: '100%', textAlign: 'left', fontFamily: FONT, background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 6, padding: '7px 10px', marginBottom: 4, color: 'var(--text-primary)', cursor: 'pointer', display: 'block' }

// Slide-in drawer for one person. Everything saves immediately (it calls the board's handlers).
//   blocked: { [eventId]: reason }  events this person cannot go to (double-booking rule)
export default function StaffPanel({ panel, events, toursById, blocked, loadingBlocked, onClose, onSetStatus, onMoveTo, onSwapAt, onCopy, onRemove, reworkGroups = [], onResolveRework, onDeleteRework }) {
  const { assignment, position, slotIndex, event } = panel
  const [section, setSection] = useState(null) // 'move' | 'swap' | null
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const name = staffDisplayName(assignment.staff) || 'Staff'
  const others = events.filter(e => e.id !== event.id)

  const eventList = (action, blockedFor) => (
    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
      {others.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No other events loaded.</div>}
      {others.map(ev => {
        const reason = blockedFor ? blocked[ev.id] : null
        const tour = toursById[ev.tour_id]
        return (
          <button key={ev.id} type="button" disabled={!!reason} onClick={() => action(ev)}
            title={reason || undefined}
            style={{ ...rowBtn, opacity: reason ? 0.5 : 1, cursor: reason ? 'not-allowed' : 'pointer', borderLeft: `3px solid ${tour?.color || 'var(--border-strong)'}` }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{formatLocation(ev.city, ev.state, ev.country, 'compact')}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>{tour?.name} · {fmtEventRange(ev)}</span>
            {reason && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--color-danger)', marginTop: 2 }}><IconBan size={12} /> {reason}</span>}
          </button>
        )
      })}
    </div>
  )

  return createPortal(
    <>
      <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8999, background: 'rgba(0,0,0,0.25)' }} />
      <aside role="dialog" aria-label={`${name} details`} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '100vw', zIndex: 9000, overflowY: 'auto', boxSizing: 'border-box',
        background: 'var(--surface-card)', borderLeft: 'var(--tile-border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', padding: 18, fontFamily: FONT, color: 'var(--text-primary)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
              {position.title}{slotIndex > 1 ? ` ${slotIndex}` : ''}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {formatLocation(event.city, event.state, event.country, 'compact')} · {fmtEventRange(event)}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IconX size={20} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>Status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATUS_OPTIONS.map(o => {
              const on = assignment.status === o.value
              return (
                <button key={o.value} type="button" onClick={() => onSetStatus(o.value)}
                  style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 14, cursor: 'pointer', color: on ? '#04140b' : o.color, background: on ? o.color : o.pill, border: `1.5px solid ${o.color}` }}>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {reworkGroups.length > 0 && (
          <div data-panel-rework="" style={{ marginBottom: 16 }}>
            <div style={{ ...sectionTitle, color: 'var(--color-danger)' }}>Travel Needs Rework</div>
            <ReworkList groups={reworkGroups} onResolve={onResolveRework} onDelete={onDeleteRework} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>Move to Another Event</div>
          {section === 'move' ? (
            <>
              {loadingBlocked && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Checking availability…</div>}
              {eventList(onMoveTo, true)}
            </>
          ) : (
            <button type="button" onClick={() => setSection('move')} style={rowBtn}><IconArrowsExchange size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Choose an Event</button>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>Swap With Someone</div>
          {section === 'swap' ? (
            <>
              {loadingBlocked && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Checking availability…</div>}
              {eventList(onSwapAt, true)}
            </>
          ) : (
            <button type="button" onClick={() => setSection('swap')} style={rowBtn}><IconSwitchHorizontal size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Pick the Other Event, Then the Person</button>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>Copy to Other Events</div>
          <button type="button" onClick={onCopy} style={rowBtn}><IconCopy size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Choose Events to Copy To</button>
        </div>

        <div style={{ borderTop: '0.5px solid var(--border-default)', paddingTop: 14 }}>
          <button type="button" onClick={onRemove}
            style={{ ...rowBtn, borderColor: 'var(--color-danger)', color: 'var(--color-danger)', fontWeight: 600, textAlign: 'center' }}>
            <IconTrash size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Remove From This Event
          </button>
        </div>
      </aside>
    </>,
    document.body
  )
}
