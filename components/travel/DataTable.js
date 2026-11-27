'use client'

// One column definition drives the header AND every body row of a table, so their left edges always match.
//   cols: [{ key, label, width (percent), align: 'left' | 'center' | 'right', render(row) }]
import { LINE, SMALL_LABEL, CARD, FS } from './shared'

const CELL_PAD = '8px 8px'
export const thStyle = (col) => ({ ...SMALL_LABEL, textAlign: col.align || 'left', padding: CELL_PAD, borderBottom: `1px solid ${LINE}`, background: 'var(--surface-raised)', position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'normal', overflowWrap: 'normal', lineHeight: 1.25, verticalAlign: 'bottom', boxSizing: 'border-box' })
export const tdStyle = (col) => ({ textAlign: col.align || 'left', padding: CELL_PAD, borderBottom: `1px solid ${LINE}`, verticalAlign: 'middle', fontSize: FS.body, color: 'var(--text-primary)', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col.wrap ? 'normal' : 'nowrap' })

// A card tile with its own scroll container; the header row stays locked while the body scrolls (same pattern as the staffing grid).
// Short tables shrink to fit. minWidth is only for tables that cannot be narrower.
export function TableShell({ cols, minWidth = 0, children, tableRef, maxHeight = 'calc(100vh - 260px)' }) {
  return (
    <div data-table-card="" style={{ ...CARD, overflow: 'auto', flexShrink: 0, maxHeight }}>
      <table ref={tableRef} style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'fixed', minWidth: minWidth || undefined }}>
        <colgroup>{cols.map(c => <col key={c.key} style={{ width: `${c.width}%` }} />)}</colgroup>
        <thead><tr>{cols.map(c => <th key={c.key} data-col={c.key} style={thStyle(c)}>{c.label}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function BodyRow({ cols, row, onClick, hover = true, rowProps = {}, rowStyle = {} }) {
  return (
    <tr {...rowProps} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...rowStyle }}
      onMouseEnter={hover ? (e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }) : undefined} onMouseLeave={hover ? (e => { e.currentTarget.style.background = 'transparent' }) : undefined}>
      {cols.map(c => <td key={c.key} data-col={c.key} style={tdStyle(c)}>{c.render(row)}</td>)}
    </tr>
  )
}

export function GroupRow({ cols, children, right, rowProps = {}, rowStyle = {}, onClick }) {
  return (
    <tr {...rowProps} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...rowStyle }}><td colSpan={cols.length} style={{ ...SMALL_LABEL, fontSize: FS.header, padding: '6px 10px', background: 'color-mix(in srgb, var(--color-info) 6%, transparent)', borderBottom: `1px solid ${LINE}`, color: 'var(--color-info)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{children}</span>{right ? <span>{right}</span> : null}</div>
    </td></tr>
  )
}

export function ExpandRow({ cols, children }) {
  return <tr><td colSpan={cols.length} style={{ padding: 0, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderBottom: `1px solid ${LINE}` }}>{children}</td></tr>
}

export function EmptyRow({ cols, children }) {
  return <tr><td colSpan={cols.length} style={{ padding: '10px 8px', fontSize: FS.body, color: 'var(--text-muted-legible)' }}>{children}</td></tr>
}
