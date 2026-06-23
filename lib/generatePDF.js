import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PlusJakartaSansRegular } from './fonts/PlusJakartaSans-Regular'
import { PlusJakartaSansBold } from './fonts/PlusJakartaSans-Bold'

function registerFonts(doc) {
  doc.addFileToVFS('PlusJakartaSans-Regular.ttf', PlusJakartaSansRegular)
  doc.addFont('PlusJakartaSans-Regular.ttf', 'PlusJakartaSans', 'normal')
  doc.addFileToVFS('PlusJakartaSans-Bold.ttf', PlusJakartaSansBold)
  doc.addFont('PlusJakartaSans-Bold.ttf', 'PlusJakartaSans', 'bold')
  doc.setFont('PlusJakartaSans', 'normal')
}

export function createPDF({ title, subtitle, tourColor, rows, columns, density = 'normal' }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  registerFonts(doc)

  const pageW = doc.internal.pageSize.getWidth()
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })

  const cellPadding = density === 'compact' ? 2 : density === 'spacious' ? 6 : 4
  const fontSize = density === 'compact' ? 8 : density === 'spacious' ? 11 : 9

  // White header background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, 30, 'F')

  // Title
  doc.setFont('PlusJakartaSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20, 20, 20)
  doc.text(title, pageW / 2, 13, { align: 'center' })

  // Subtitle
  doc.setFont('PlusJakartaSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(subtitle, pageW / 2, 20, { align: 'center' })

  // Generated date right
  doc.setFontSize(8)
  doc.text(`Generated: ${today}`, pageW - 10, 10, { align: 'right' })

  // Tour color rule
  const r = parseInt(tourColor?.slice(1, 3) || '33', 16)
  const g = parseInt(tourColor?.slice(3, 5) || 'FF', 16)
  const b = parseInt(tourColor?.slice(5, 7) || '99', 16)
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.8)
  doc.line(10, 31, pageW - 10, 31)

  // Table
  autoTable(doc, {
    startY: 35,
    head: [columns],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'PlusJakartaSans',
      fontSize,
      cellPadding,
      textColor: [40, 40, 40],
    },
    headStyles: {
      font: 'PlusJakartaSans',
      fontStyle: 'bold',
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      fontSize,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 10, right: 10 },
  })

  return doc
}
