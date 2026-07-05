import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_COLORS = {
  'confirmed': { color: '#0F8F5C', bg: '#DCF3E7', border: '#86D9B2' },
  '1-hold':    { color: '#8A6D00', bg: '#FCF2C9', border: '#F0D060' },
  '2-hold':    { color: '#B5560A', bg: '#FCE2C2', border: '#F0A85C' },
  '3-hold':    { color: '#C2294A', bg: '#FBDEE5', border: '#F0A8B8' },
  'tentative': { color: '#8B6FE8', bg: '#EAE3FB', border: '#C5B5F0' },
  'date-hold': { color: '#717977', bg: '#EEEEEF', border: '#D5D5D8' },
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

export function createPDF({ title, subtitle, tourColor, columns, rows, rowStatuses = [], statusColLabel = 'Status', density = 'normal', orientation = 'portrait', showType = '', eventCount = 0 }) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Density settings
  const fontSize = density === 'compact' ? 8 : 9
  const cellPadding = density === 'compact' ? 2 : 4

  // Tour color RGB
  const [tr, tg, tb] = hexToRgb(tourColor || '#10E687')

  // LEFT SIDE — Tour name, show type, region · year
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(17, 17, 17)
  doc.text(title, 10, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(showType, 10, 15)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(subtitle || '', 10, 20)

  // RIGHT SIDE — Shows count, generated date, powered by
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(17, 17, 17)
  doc.text(`Shows: ${eventCount}`, pageW - 10, 10, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(`Generated: ${today}`, pageW - 10, 15, { align: 'right' })
  doc.text('Powered by CommandTOUR', pageW - 10, 19, { align: 'right' })

  // Full-width delineator line
  doc.setDrawColor(tr, tg, tb)
  doc.setLineWidth(0.6)
  doc.line(10, 23, pageW - 10, 23)

  // Find status column index
  const statusColIdx = columns.indexOf(statusColLabel)

  // Build autoTable
  autoTable(doc, {
    startY: 27,
    head: [columns],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize,
      cellPadding,
      textColor: [0, 0, 0],
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [tr, tg, tb],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize,
      cellPadding,
      lineWidth: 0,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    columnStyles: statusColIdx >= 0 ? {
      [statusColIdx]: { halign: 'center' }
    } : {},
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      // Bottom border under header row
      if (data.section === 'head') {
        return
      }

      // Status column — bold colored text, no pill
      if (statusColIdx >= 0 && data.column.index === statusColIdx && data.section === 'body') {
        const rawStatus = rowStatuses[data.row.index] || ''
        const sc = STATUS_COLORS[rawStatus]
        if (!sc) return

        const { x, y, width, height } = data.cell
        const label = data.cell.raw || ''

        // Clear cell with alternating background
        const isAlt = data.row.index % 2 !== 0
        doc.setFillColor(...(isAlt ? [240,240,240] : [255,255,255]))
        doc.rect(x, y, width, height, 'F')

        // Draw bold colored text centered in cell
        const textRgb = hexToRgb(sc.color)
        doc.setTextColor(...textRgb)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(fontSize)
        doc.text(label, x + width / 2, y + height / 2 + 0.8, { align: 'center' })

        // Reset
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${data.pageNumber}`, pageW - 10, pageH - 5, { align: 'right' })
    },
  })
  // This is handled by theme: 'plain' with alternating rows — no additional lines needed.

  return doc
}
