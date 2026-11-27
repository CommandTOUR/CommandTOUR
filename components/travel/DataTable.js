'use client'

// One column definition drives the header AND every body row of a table, so their left edges always match.
//   cols: [{ key, label, width (percent), align: 'left' | 'center' | 'right', render(row) }]
import { LINE, SMALL_LABEL, CARD } from './shared'

const CELL_PAD = '9px 10px'
export const thStyle = (col) => ({ ...SMALL_LABEL, textAlign: col.align || 'left', padding: CELL_PAD, borderBottom: `1px solid ${LINE}`, background: 'var(--surface-raised, rgba(0,0,0,0.03))', whiteSpace: 'nowrap', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis' })
export const tdStyle = (col) => ({ textAlign: col.align || 'left', padding: CELL_PAD, borderBottom: `1px solid ${LINE}`, verticalAlign: 'middle', fontSize: 15, color: 'var(--text-primary)', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col.wrap ? 'normal' : 'nowrap' })

export function TableShell({ cols, minWidth = 900, children, tableRef }) {
  return (
    <div style={{ ...CARD, overflow: 'auto', flexShrink: 0 }}>
      <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', minWidth }}>
        <colgroup>{cols.map(c => <col key={c.key} style={{ width: `${c.width}%` }} />)}</colgroup>
        <thead><tr>{cols.map(c => <th key={c.key} data-col={c.key} style={thStyle(c)}>{c.label}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function BodyRow({ cols, row, onClick, hover = true }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={hover ? (e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }) : undefined} onMouseLeave={hover ? (e => { e.currentTarget.style.background = 'transparent' }) : undefined}>
      {cols.map(c => <td key={c.key} data-col={c.key} style={tdStyle(c)}>{c.render(row)}</td>)}
    </tr>
  )
}

export function GroupRow({ cols, children, right }) {
  return (
    <tr><td colSpan={cols.length} style={{ ...SMALL_LABEL, fontSize: 12, padding: '6px 10px', background: 'color-mix(in srgb, var(--color-info) 6%, transparent)', borderBottom: `1px solid ${LINE}`, color: 'var(--color-info)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{children}</span>{right ? <span>{right}</span> : null}</div>
    </td></tr>
  )
}

export function ExpandRow({ cols, children }) {
  return <tr><td colSpan={cols.length} style={{ padding: 0, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderBottom: `1px solid ${LINE}` }}>{children}</td></tr>
}

export function EmptyRow({ cols, children }) {
  return <tr><td colSpan={cols.length} style={{ padding: '12px 10px', fontSize: 15, color: 'var(--text-muted-legible)' }}>{children}</td></tr>
}
