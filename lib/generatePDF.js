import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const LIGHT_LOGO = '/images/CommandTOUR_Branding-2-LightMode.png'

export function createPDF({ title, subtitle, tourColor, rows, columns }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })

  // Header background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, 28, 'F')

  // Logo
  doc.addImage(LIGHT_LOGO, 'PNG', 10, 4, 60, 18)

  // Title (center)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)
  doc.text(title, pageW / 2, 12, { align: 'center' })

  // Subtitle (center)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(subtitle, pageW / 2, 19, { align: 'center' })

  // Generated date (right)
  doc.setFontSize(9)
  doc.text(`Generated: ${today}`, pageW - 10, 12, { align: 'right' })

  // Rule below header in tour color
  const r = parseInt(tourColor?.slice(1, 3) || '33', 16)
  const g = parseInt(tourColor?.slice(3, 5) || 'FF', 16)
  const b = parseInt(tourColor?.slice(5, 7) || '99', 16)
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.8)
  doc.line(10, 29, pageW - 10, 29)

  // Table
  autoTable(doc, {
    startY: 33,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [40, 40, 40],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: 10, right: 10 },
  })

  return doc
}
