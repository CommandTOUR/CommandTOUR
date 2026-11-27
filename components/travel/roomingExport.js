'use client'

// Excel rooming list: the hotel header block, then rooms sorted by cost group, check-in and name, then totals.
// Built in the browser from the data already on screen (exceljs is loaded only when the button is used).
import { money, fmtDay } from './shared'

const COLUMNS = [
  ['Cost Group', 16], ['Guest 1', 24], ['Guest 2', 24], ['Type', 9], ['Check In', 14], ['Check Out', 14],
  ['Nights', 8], ['Early Check-In', 15], ['Confirmation', 18], ['Parking', 10],
]

export async function downloadRoomingXlsx({ event, hotel, sheet, fileName }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Rooming List')
  ws.columns = COLUMNS.map(([, width]) => ({ width }))

  const bold = (row) => { row.font = { bold: true } }
  const title = ws.addRow([hotel?.hotel_name || 'Rooming List']); title.font = { bold: true, size: 14 }
  const info = [
    ['Event', [event?.city, event?.state].filter(Boolean).join(', ')],
    ['Address', hotel?.address || ''], ['Phone', hotel?.phone || ''], ['Onsite Contact', hotel?.onsite_contact || ''],
    ['Single Rate', hotel?.single_rate != null ? money(hotel.single_rate) : ''], ['Double Rate', hotel?.double_rate != null ? money(hotel.double_rate) : ''], ['Suite Rate', hotel?.suite_rate != null ? money(hotel.suite_rate) : ''],
    ['Tax', hotel?.tax_rate != null ? `${hotel.tax_rate}%` : ''],
    ['Cutoff Date', hotel?.cutoff_date ? fmtDay(hotel.cutoff_date) : ''], ['Rooming List Sent On', hotel?.rooming_list_sent_on ? fmtDay(hotel.rooming_list_sent_on) : ''],
  ]
  for (const [k, v] of info) { const r = ws.addRow([k, v]); r.getCell(1).font = { bold: true } }
  ws.addRow([])

  const head = ws.addRow(COLUMNS.map(([label]) => label)); bold(head)
  head.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }; c.border = { bottom: { style: 'thin' } } })
  for (const r of sheet.rows) {
    ws.addRow([r.costGroup, r.guest1, r.guest2, r.type, r.checkIn ? fmtDay(r.checkIn) : '', r.checkOut ? fmtDay(r.checkOut) : '', r.nights, r.early ? 'Yes' : '', r.confirmation, r.parking])
  }
  ws.addRow([])
  const t = sheet.totals
  for (const [k, v] of [['Rooms', t.rooms], ['Room Nights', t.roomNights], ['First Check-In', t.firstCheckIn ? fmtDay(t.firstCheckIn) : ''], ['Last Check-Out', t.lastCheckOut ? fmtDay(t.lastCheckOut) : '']]) {
    const r = ws.addRow([k, v]); r.getCell(1).font = { bold: true }; r.getCell(2).alignment = { horizontal: 'left' }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
