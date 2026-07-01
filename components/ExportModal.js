'use client'

import { useState } from 'react'
import { createPDF } from '../lib/generatePDF'

export default function ExportModal({
  isOpen,
  onClose,
  title,
  subtitle,
  tourColor,
  logo_url,
  allColumns,
  rows,
  filename,
}) {
  const [enabledColumns, setEnabledColumns] = useState(
    () => allColumns.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultOn !== false }), {})
  )
  const [density, setDensity] = useState('normal')

  if (!isOpen) return null

  const visibleCols = allColumns.filter(c => enabledColumns[c.key])
  const visibleColIndices = allColumns.map((c, i) => enabledColumns[c.key] ? i : -1).filter(i => i !== -1)
  const filteredRows = rows.map(row => visibleColIndices.map(i => row[i]))

  const handleDownload = () => {
    const doc = createPDF({
      title,
      subtitle,
      tourColor,
      columns: visibleCols.map(c => c.label),
      rows: filteredRows,
      density,
    })
    doc.save(`${filename}.pdf`)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
    const rowPadding = density === 'compact' ? '4px 8px' : density === 'spacious' ? '12px 8px' : '8px 8px'
    const fontSize = density === 'compact' ? '11px' : density === 'spacious' ? '14px' : '12px'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: white; color: #1a1a1a; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid ${tourColor || '#33FF99'}; }
          .header img { height: 40px; }
          .header-center { text-align: center; flex: 1; }
          .header-center h1 { font-size: 16px; font-weight: 700; }
          .header-center p { font-size: 11px; color: #666; margin-top: 2px; }
          .header-right { font-size: 10px; color: #999; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f0f0f0; font-weight: 700; font-size: ${fontSize}; padding: ${rowPadding}; text-align: left; border: 1px solid #ddd; }
          td { font-size: ${fontSize}; padding: ${rowPadding}; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #fafafa; }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; size: portrait; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logo_url || (window.location.origin + '/images/CommandTOUR_Branding-2-LightMode.png')}" />
          <div class="header-center">
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
          <div class="header-right">Generated: ${today}</div>
        </div>
        <table>
          <thead>
            <tr>${visibleCols.map(c => `<th>${c.label}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${filteredRows.map(row => `<tr>${row.map(cell => `<td>${cell || '—'}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const previewCellPad = density === 'compact' ? '4px 6px' : density === 'spacious' ? '10px 8px' : '6px 8px'
  const previewFontSize = density === 'compact' ? 10 : density === 'spacious' ? 13 : 11

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 16, width: '90vw', maxWidth: 1000, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700 }}>Export / Print</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LEFT — Options */}
          <div style={{ width: 220, padding: '20px 20px', overflowY: 'auto', borderRight: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <p style={{ color: '#94a3b8', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Columns</p>
            {allColumns.map(col => (
              <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enabledColumns[col.key]}
                  onChange={e => setEnabledColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                  style={{ accentColor: '#33FF99', width: 14, height: 14 }}
                />
                <span style={{ color: '#f1f5f9', fontSize: 13 }}>{col.label}</span>
              </label>
            ))}

            <p style={{ color: '#94a3b8', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 24 }}>Row Density</p>
            {['compact', 'normal', 'spacious'].map(d => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="density"
                  value={d}
                  checked={density === d}
                  onChange={() => setDensity(d)}
                  style={{ accentColor: '#33FF99' }}
                />
                <span style={{ color: '#f1f5f9', fontSize: 13, textTransform: 'capitalize' }}>{d}</span>
              </label>
            ))}
          </div>

          {/* RIGHT — Live Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#0a1628' }}>
            <div style={{ background: 'white', borderRadius: 8, padding: '20px 24px', minHeight: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a' }}>

              {/* Preview header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${tourColor || '#33FF99'}` }}>
                <img src={logo_url || '/images/CommandTOUR_Branding-2-LightMode.png'} style={{ height: 32 }} alt="CommandTOUR" />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{subtitle}</div>
                </div>
                <div style={{ fontSize: 9, color: '#999' }}>
                  Generated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Preview table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: previewFontSize }}>
                <thead>
                  <tr>
                    {visibleCols.map(c => (
                      <th key={c.key} style={{ background: '#f0f0f0', fontWeight: 700, padding: previewCellPad, textAlign: 'left', border: '1px solid #ddd', fontSize: 'inherit' }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: previewCellPad, border: '1px solid #ddd', fontSize: 'inherit' }}>{cell || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '0.5px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f1f5f9', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handlePrint} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#f1f5f9', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🖨 Print</button>
          <button onClick={handleDownload} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', background: '#33FF99', border: 'none', borderRadius: 8, color: '#0a1628', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>↓ Download PDF</button>
        </div>
      </div>
    </div>
  )
}
