'use client'

import { IconAlertTriangle, IconCalendarExclamation, IconLock } from '@tabler/icons-react'
import { STATUS_BY_VALUE } from './shared'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

// The status dot shown on a person tile (Needs Attention uses a warning icon instead of a dot)
function DotKey({ status, label }) {
  const st = STATUS_BY_VALUE[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      {status === 'needs_attention'
        ? <IconAlertTriangle size={14} color={st.color} aria-hidden="true" />
        : <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, display: 'inline-block' }} />}
      {label}
    </span>
  )
}

// Hollow red ring = open position; lock icon = locked position
function RingKey() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid var(--color-danger)', display: 'inline-block' }} />
      Open
    </span>
  )
}

function LockKey() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      <IconLock size={14} aria-hidden="true" />
      Locked
    </span>
  )
}

// One long row (wraps on narrow screens): tour border colors, then the status dot key
export default function StaffLegend() {
  const title = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px 14px', flexWrap: 'nowrap', whiteSpace: 'nowrap', overflowX: 'auto', fontFamily: FONT }} aria-label="Legend">
      <span style={title}>Key</span>
      <DotKey status="confirmed" label="Confirmed" />
      <DotKey status="pending" label="Pending" />
      <DotKey status="variant" label="Variant" />
      <DotKey status="needs_attention" label="Needs Attention" />
      <RingKey />
      <LockKey />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        <IconCalendarExclamation size={15} color="#FF9500" aria-hidden="true" /> Double-Booked This Weekend
      </span>
    </div>
  )
}
