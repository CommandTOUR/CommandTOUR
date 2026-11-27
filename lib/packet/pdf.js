// Event Packet layout, built with react-pdf. Uses React.createElement (no JSX) so the generators also run in plain Node scripts.
import React from 'react'
import { Document, Page, View, Text, renderToBuffer, StyleSheet } from '@react-pdf/renderer'
import { C, FONT, PAGE_MARGIN, tint, tourColor, registerFonts } from './theme'
import { fmtDate, fmtDay, fmtLongDate, fmtMonthDay, fmtTime, fmtRange, generatedDate, compactLocation, statusLabel } from './format'

const h = React.createElement
const S = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: 9, color: C.text, paddingTop: PAGE_MARGIN, paddingBottom: PAGE_MARGIN + 6, paddingHorizontal: PAGE_MARGIN },
  row: { flexDirection: 'row', alignItems: 'center' },
})

// ---------- small parts ----------

const Pill = ({ label, color, bg, dot, border }) => h(View, { style: { flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 20, paddingVertical: 2.5, paddingHorizontal: 8, borderWidth: border ? 0.75 : 0, borderColor: border } },
  dot ? h(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginRight: 5 } }) : null,
  h(Text, { style: { fontSize: 8, fontWeight: 600, color } }, label))

const Amber = ({ children = 'Not entered', size }) => h(Text, { style: { color: C.amber, fontWeight: 600, fontSize: size } }, children)

const DashedBox = ({ children }) => h(View, { wrap: false, style: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 6, backgroundColor: C.soft, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' } },
  h(Text, { style: { color: C.muted, fontSize: 9 } }, children))

const Label = ({ children }) => h(Text, { style: { fontSize: 7.5, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.7 } }, children)

const SectionTitle = ({ children, count }) => h(View, { minPresenceAhead: 50, style: { ...S.row, marginTop: 14, marginBottom: 6 } },
  h(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue, marginRight: 6 } }),
  h(Text, { style: { fontSize: 11, fontWeight: 700 } }, children),
  count !== undefined ? h(Text, { style: { fontSize: 9, color: C.muted, marginLeft: 6 } }, String(count)) : null)

const Tile = ({ label, children, flex = 1 }) => h(View, { wrap: false, style: { ...(flex ? { flex } : { width: '100%' }), borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 9 } },
  h(Label, null, label), h(View, { style: { marginTop: 3 } }, children))

const Value = ({ children, size = 11 }) => h(Text, { style: { fontSize: size, fontWeight: 600 } }, children)

// ---------- page shell: header band + footer on every page ----------

const STATUS_COLOR = { confirmed: C.green, tentative: C.blue, '1-hold': C.amber, '2-hold': C.amber, '3-hold': C.amber, 'date-hold': C.muted }

function Band({ ctx, title, count }) {
  const { event, tour, shows, range } = ctx
  const color = tourColor(tour.color)
  const st = (event.status || '').toLowerCase()
  const stColor = STATUS_COLOR[st] || C.muted
  const showCount = shows.length || event.num_shows || 0
  const venueLine = [event.venue_name, fmtRange(range)].filter(Boolean).join(' · ')
  return h(View, { fixed: true, style: { borderWidth: 2.5, borderColor: color, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' } },
    h(View, { style: { flex: 1, paddingRight: 10 } },
      h(View, { style: { flexDirection: 'row' } }, h(Pill, { label: tour.name || 'Tour', color: C.text, bg: tint(color, 0.22), dot: color })),
      h(Text, { style: { fontSize: 22, fontWeight: 700, marginTop: 5, lineHeight: 1.05 } }, event.city || 'Location TBD'),
      h(Text, { style: { fontSize: 9.5, color: C.muted, marginTop: 2 } }, venueLine),
      h(View, { style: { ...S.row, marginTop: 6 } },
        event.status ? h(Pill, { label: statusLabel(event.status), color: stColor, bg: tint(stColor, 0.12), border: tint(stColor, 0.5) }) : null,
        showCount ? h(Text, { style: { fontSize: 9, color: C.muted, marginLeft: event.status ? 8 : 0 } }, `${showCount} ${showCount === 1 ? 'show' : 'shows'}`) : null)),
    h(View, { style: { alignItems: 'flex-end', justifyContent: 'space-between' } },
      count ? h(Pill, { label: count, color: C.blue, bg: tint(C.blue, 0.1), border: tint(C.blue, 0.4) }) : h(View),
      h(View, { style: { alignItems: 'flex-end' } },
        h(Text, { style: { fontSize: 19, fontWeight: 700 } }, title),
        h(Text, { style: { fontSize: 8.5, color: C.muted, marginTop: 2 } }, `Event Packet · Week of ${fmtMonthDay(range.start) || 'TBD'}`))))
}

function Footer({ ctx, timeZone }) {
  const { event, tour } = ctx
  const date = generatedDate(timeZone)
  return h(View, { fixed: true, style: { position: 'absolute', left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 11, flexDirection: 'row', justifyContent: 'space-between' } },
    h(Text, { style: { fontSize: 7.5, color: C.muted } }, `${tour.name || 'Tour'} · ${compactLocation(event)} · Event Packet`),
    h(Text, { style: { fontSize: 7.5, color: C.muted }, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · Generated ${date}` }))
}

// `columns` (optional): a column-header element repeated at the top of continuation pages
function Shell({ ctx, title, count, timeZone, columns, children }) {
  return h(Document, { title: `${ctx.tour.name || 'Tour'} - ${title}`, author: 'CommandTOUR' },
    h(Page, { size: 'LETTER', orientation: 'portrait', style: S.page },
      h(Band, { ctx, title, count }),
      columns ? h(View, { fixed: true, render: ({ subPageNumber }) => (subPageNumber > 1 ? columns : h(View)) }) : null,
      children,
      h(Footer, { ctx, timeZone })))
}

// ---------- tables ----------

const pct = (w) => `${w}%`
function ColumnHeader({ cols }) {
  return h(View, { style: { flexDirection: 'row', backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 4 } },
    cols.map(c => h(View, { key: c.label, style: { width: pct(c.w), paddingRight: 6 } }, h(Label, null, c.label))))
}

function Cell({ w, children }) { return h(View, { style: { width: pct(w), paddingRight: 6 } }, children) }
const Plain = ({ children, bold, muted }) => children ? h(Text, { style: { fontWeight: bold ? 700 : 400, color: muted ? C.muted : C.text } }, children) : h(Text, { style: { color: C.muted } }, '—')

// One bordered card per day. `row(r)` returns the array of cells for a row.
function DayGroups({ days, cols, noDateLabel, unit, row }) {
  return days.map((g, gi) => h(View, { key: gi },
    h(View, { wrap: false, minPresenceAhead: 45, style: { ...S.row, marginTop: gi === 0 ? 4 : 10, marginBottom: 4 } },
      h(View, { style: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue, marginRight: 6 } }),
      h(Text, { style: { fontSize: 10.5, fontWeight: 700 } }, g.date ? fmtDate(g.date) : noDateLabel),
      h(Text, { style: { fontSize: 9, color: C.muted, marginLeft: 6 } }, `${g.rows.length} ${g.rows.length === 1 ? unit.one : unit.many}`)),
    h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6 } },
      g.rows.map((r, i) => h(View, { key: i, wrap: false, style: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: i === g.rows.length - 1 ? 0 : 0.75, borderBottomColor: C.divider } }, row(r, cols))))))
}

const TRAVEL_COLS = [{ label: 'Name', w: 19 }, { label: 'Time', w: 10 }, { label: 'Mode', w: 8 }, { label: 'Airline · Flight', w: 18 }, { label: 'Airport', w: 8 }, { label: 'Ground transport', w: 19 }, { label: 'Notes', w: 18 }]
const MODE = { flying: 'Flight', driving: 'Driving', carpool: 'Carpool', books_own: 'Books Own', rail: 'Rail', other: 'Other' }

export function TravelDoc({ ctx, data, kind, timeZone }) {
  const isArr = kind === 'arrivals'
  const unit = isArr ? { one: 'arrival', many: 'arrivals' } : { one: 'departure', many: 'departures' }
  const cols = TRAVEL_COLS
  const tail = data.total > 0 && data.withoutEntry > 0
    ? h(Text, { style: { marginTop: 12, color: C.amber, fontWeight: 600 } }, `${data.withoutEntry} of ${data.total} assigned staff have no ${unit.one} entered.`)
    : null
  return h(Shell, { ctx, timeZone, title: isArr ? 'Arrivals' : 'Departures', count: `${data.count} ${data.count === 1 ? unit.one : unit.many}`, columns: h(ColumnHeader, { cols }) },
    data.count === 0
      ? h(DashedBox, null, `No ${unit.many} entered yet.`)
      : h(View, null,
        h(ColumnHeader, { cols }),
        h(DayGroups, {
          days: data.days, cols, unit, noDateLabel: 'No date entered',
          row: (r) => [
            h(Cell, { key: 0, w: cols[0].w }, h(Plain, { bold: true }, r.name)),
            h(Cell, { key: 1, w: cols[1].w }, h(Plain, null, fmtTime(r.time))),
            h(Cell, { key: 2, w: cols[2].w }, h(Plain, null, MODE[r.mode] || r.mode)),
            h(Cell, { key: 3, w: cols[3].w }, h(Plain, null, [r.airline, r.flight].filter(Boolean).join(' · '))),
            h(Cell, { key: 4, w: cols[4].w }, h(Plain, null, r.airport)),
            h(Cell, { key: 5, w: cols[5].w }, h(Plain, null, r.transport)),
            h(Cell, { key: 6, w: cols[6].w }, h(Plain, { muted: true }, r.notes)),
          ],
        })),
    tail)
}

const RENTAL_COLS = [{ label: 'Name', w: 17 }, { label: 'Vendor · Class', w: 15 }, { label: 'Pickup', w: 18 }, { label: 'Return', w: 18 }, { label: 'Confirmation', w: 15 }, { label: 'Notes', w: 17 }]
const DateLoc = ({ date, loc }) => h(View, null,
  date ? h(Text, { style: { fontWeight: 600 } }, fmtDay(date)) : h(Text, { style: { color: C.muted } }, '—'),
  loc ? h(Text, { style: { color: C.muted, fontSize: 8.5 } }, loc) : null)

export function RentalsDoc({ ctx, data, timeZone }) {
  const cols = RENTAL_COLS
  return h(Shell, { ctx, timeZone, title: 'Rentals', count: `${data.count} ${data.count === 1 ? 'rental' : 'rentals'}`, columns: h(ColumnHeader, { cols }) },
    data.count === 0
      ? h(DashedBox, null, 'No rentals entered yet.')
      : h(View, null,
        h(ColumnHeader, { cols }),
        h(DayGroups, {
          days: data.days, cols, unit: { one: 'pickup', many: 'pickups' }, noDateLabel: 'No pickup date entered',
          row: (r) => [
            h(Cell, { key: 0, w: cols[0].w }, h(Plain, { bold: true }, r.name)),
            h(Cell, { key: 1, w: cols[1].w }, h(Plain, null, [r.vendor, r.carClass].filter(Boolean).join(' · '))),
            h(Cell, { key: 2, w: cols[2].w }, h(DateLoc, { date: r.pickupDate, loc: r.pickupLocation })),
            h(Cell, { key: 3, w: cols[3].w }, h(DateLoc, { date: r.returnDate, loc: r.returnLocation })),
            h(Cell, { key: 4, w: cols[4].w }, r.confirmation ? h(Text, { style: { fontWeight: 600 } }, r.confirmation) : h(Amber, { size: 8.5 })),
            h(Cell, { key: 5, w: cols[5].w }, h(Plain, { muted: true }, r.notes)),
          ],
        })))
}

const ROOM_COLS = [{ label: 'Name 1', w: 22 }, { label: 'Name 2', w: 22 }, { label: 'Beds', w: 10 }, { label: 'Check-in', w: 14 }, { label: 'Check-out', w: 14 }, { label: 'Confirmation #', w: 18 }]

export function HotelDoc({ ctx, data, timeZone }) {
  const { hotel, rooms, unroomed } = data
  const cols = ROOM_COLS
  const cards = h(View, { style: { flexDirection: 'row', gap: 8 } },
    h(Tile, { label: 'Hotel', flex: 2 },
      hotel?.hotel_name ? h(Value, null, hotel.hotel_name) : h(Amber, { size: 11 }),
      hotel?.address ? h(Text, { style: { color: C.muted, marginTop: 2 } }, hotel.address) : (hotel?.hotel_name ? h(View, { style: { marginTop: 2 } }, h(Amber, { size: 9 }, 'Address not entered')) : null)),
    h(Tile, { label: 'Group check-in' }, hotel?.check_in_date ? h(Value, null, fmtLongDate(hotel.check_in_date)) : h(Amber, { size: 11 })),
    h(Tile, { label: 'Group check-out' }, hotel?.check_out_date ? h(Value, null, fmtLongDate(hotel.check_out_date)) : h(Amber, { size: 11 })))
  return h(Shell, { ctx, timeZone, title: 'Hotel', count: `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`, columns: h(ColumnHeader, { cols }) },
    cards,
    hotel?.notes ? h(Text, { style: { marginTop: 8, color: C.muted } }, hotel.notes) : null,
    h(SectionTitle, { count: rooms.length }, 'Rooming list'),
    rooms.length === 0
      ? h(DashedBox, null, 'No rooming list entered yet.')
      : h(View, null,
        h(ColumnHeader, { cols }),
        h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6 } },
          rooms.map((r, i) => h(View, { key: i, wrap: false, style: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: i === rooms.length - 1 ? 0 : 0.75, borderBottomColor: C.divider } },
            h(Cell, { w: cols[0].w }, h(Plain, { bold: true }, r.name1)),
            h(Cell, { w: cols[1].w }, h(Plain, { bold: true }, r.name2)),
            h(Cell, { w: cols[2].w }, h(Plain, null, r.beds)),
            h(Cell, { w: cols[3].w }, h(Plain, null, r.checkIn ? fmtMonthDay(r.checkIn) : '')),
            h(Cell, { w: cols[4].w }, h(Plain, null, r.checkOut ? fmtMonthDay(r.checkOut) : '')),
            // event_hotel_rooms has no confirmation column yet
            h(Cell, { w: cols[5].w }, h(Amber, { size: 8.5 })))))),
    h(SectionTitle, { count: unroomed.length }, 'No room assigned'),
    ctx.assigned.size === 0
      ? h(DashedBox, null, 'No staff are assigned to this event yet.')
      : unroomed.length === 0
        ? h(View, { wrap: false, style: { borderWidth: 1, borderColor: tint(C.green, 0.5), backgroundColor: tint(C.green, 0.08), borderRadius: 6, padding: 9 } }, h(Text, { style: { color: C.green, fontWeight: 600 } }, 'Everyone assigned has a room.'))
        : h(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 6, backgroundColor: C.soft, padding: 8 } },
          unroomed.map((n, i) => h(View, { key: i, wrap: false, style: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 } }, h(Text, { style: { fontWeight: 600 } }, n)))))
}

export function ScheduleDoc({ ctx, data, timeZone }) {
  const { event, shows } = ctx
  const dateTile = (label, date, sub) => h(Tile, { key: label, label, flex: 0 }, date ? h(Value, null, fmtDay(date)) : h(Amber, { size: 11 }), sub ? h(Text, { style: { color: C.muted, marginTop: 1 } }, sub) : null)
  const tiles = [dateTile('Load-in', event.load_in_date), dateTile('Load-out', event.load_out_date)]
  if (shows.length) shows.forEach((s, i) => tiles.push(h(Tile, { key: `s${i}`, label: `Show ${i + 1}`, flex: 0 },
    h(Value, null, fmtDay(s.show_date)), s.show_time ? h(Text, { style: { color: C.muted, marginTop: 1 } }, fmtTime(s.show_time)) : h(View, { style: { marginTop: 1 } }, h(Amber, { size: 9 }, 'Time not entered')))))
  else [event.saturday_date, event.sunday_date].filter(Boolean).forEach((d, i) => tiles.push(h(Tile, { key: `d${i}`, label: `Show day ${i + 1}`, flex: 0 },
    h(Value, null, fmtDay(d)), h(View, { style: { marginTop: 1 } }, h(Amber, { size: 9 }, 'Time not entered')))))
  const address = data.address
  return h(Shell, { ctx, timeZone, title: 'Schedule', count: shows.length ? `${shows.length} ${shows.length === 1 ? 'show' : 'shows'}` : (event.saturday_date || event.sunday_date) ? `${[event.saturday_date, event.sunday_date].filter(Boolean).length} show days` : '0 shows' },
    h(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } }, tiles.map(t => h(View, { key: t.key, style: { width: '23.5%' } }, t))),
    data.timeZone ? h(View, { style: { flexDirection: 'row', marginTop: 8 } }, h(Pill, { label: String(data.timeZone), color: C.blue, bg: tint(C.blue, 0.1), border: tint(C.blue, 0.4) })) : null,
    h(SectionTitle, null, 'Venue'),
    h(View, { wrap: false, style: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10 } },
      data.venueName ? h(Text, { style: { fontSize: 12, fontWeight: 700 } }, data.venueName) : h(Amber, { size: 12 }),
      address ? h(Text, { style: { color: C.muted, marginTop: 2 } }, address) : h(View, { style: { marginTop: 2 } }, h(Amber, { size: 9 }, 'Address not entered')),
      data.venuePhone ? h(Text, { style: { marginTop: 2 } }, data.venuePhone) : null),
    h(SectionTitle, { count: data.contacts.length }, 'Contacts'),
    data.contacts.length === 0 ? h(DashedBox, null, 'No contacts entered yet.')
      : h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6 } },
        data.contacts.map((c, i) => h(View, { key: i, wrap: false, style: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: i === data.contacts.length - 1 ? 0 : 0.75, borderBottomColor: C.divider } },
          h(Cell, { w: 24 }, h(Plain, { muted: true }, c.role)), h(Cell, { w: 24 }, h(Plain, { bold: true }, c.name)),
          h(Cell, { w: 20 }, h(Plain, null, c.phone)), h(Cell, { w: 32 }, h(Plain, null, c.email))))),
    h(SectionTitle, { count: shows.length }, 'Show times'),
    shows.length === 0 ? h(DashedBox, null, 'No show times entered yet.')
      : h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6 } },
        shows.map((s, i) => h(View, { key: i, wrap: false, style: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: i === shows.length - 1 ? 0 : 0.75, borderBottomColor: C.divider } },
          h(Cell, { w: 12 }, h(Plain, { bold: true }, `Show ${i + 1}`)), h(Cell, { w: 28 }, h(Plain, null, fmtDate(s.show_date))),
          h(Cell, { w: 16 }, s.show_time ? h(Plain, null, fmtTime(s.show_time)) : h(Amber, { size: 8.5 })), h(Cell, { w: 44 }, h(Plain, { muted: true }, s.notes))))),
    data.items.length ? h(View, null,
      h(SectionTitle, { count: data.items.length }, 'Day schedule'),
      h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6 } },
        data.items.map((it, i) => h(View, { key: i, wrap: false, style: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: i === data.items.length - 1 ? 0 : 0.75, borderBottomColor: C.divider } },
          h(Cell, { w: 18 }, h(Plain, { bold: true }, fmtDay(it.day_date))), h(Cell, { w: 18 }, h(Plain, null, [fmtTime(it.time_start), fmtTime(it.time_end)].filter(Boolean).join(' - '))),
          h(Cell, { w: 32 }, h(Plain, null, it.what)), h(Cell, { w: 12 }, h(Plain, null, it.who)), h(Cell, { w: 20 }, h(Plain, { muted: true }, it.notes)))))) : null,
    h(SectionTitle, null, 'Notes'),
    data.notes ? h(View, { style: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10 } }, h(Text, { style: { lineHeight: 1.4 } }, data.notes))
      : h(DashedBox, null, 'No notes entered yet.'))
}

export async function renderPdf(element) {
  registerFonts()
  return renderToBuffer(element)
}
