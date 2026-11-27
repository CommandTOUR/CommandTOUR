// Event Packet: five PDFs in one ZIP.
// Each generator is independent: (supabase, eventId, { timeZone, ctx }) -> { buffer, missing }.
// `ctx` is optional (shared event data), so a tour-level multi-week export can call them per event.
import JSZip from 'jszip'
import { loadEventContext, loadSchedule, loadTravel, loadRentals, loadHotel } from './data'
import { packetFolderName } from './format'
import { renderPdf, ScheduleDoc, TravelDoc, RentalsDoc, HotelDoc } from './pdf'
import React from 'react'

const h = React.createElement
const withCtx = async (supabase, eventId, ctx) => ctx || loadEventContext(supabase, eventId)

export async function generateSchedule(supabase, eventId, { timeZone, ctx } = {}) {
  ctx = await withCtx(supabase, eventId, ctx)
  const data = await loadSchedule(supabase, ctx)
  return { buffer: await renderPdf(h(ScheduleDoc, { ctx, data, timeZone })), missing: data.missing }
}
export async function generateArrivals(supabase, eventId, { timeZone, ctx } = {}) {
  ctx = await withCtx(supabase, eventId, ctx)
  const data = await loadTravel(supabase, ctx, 'arrivals')
  return { buffer: await renderPdf(h(TravelDoc, { ctx, data, kind: 'arrivals', timeZone })), missing: data.missing }
}
export async function generateDepartures(supabase, eventId, { timeZone, ctx } = {}) {
  ctx = await withCtx(supabase, eventId, ctx)
  const data = await loadTravel(supabase, ctx, 'departures')
  return { buffer: await renderPdf(h(TravelDoc, { ctx, data, kind: 'departures', timeZone })), missing: data.missing }
}
export async function generateRentals(supabase, eventId, { timeZone, ctx } = {}) {
  ctx = await withCtx(supabase, eventId, ctx)
  const data = await loadRentals(supabase, ctx)
  return { buffer: await renderPdf(h(RentalsDoc, { ctx, data, timeZone })), missing: data.missing }
}
export async function generateHotel(supabase, eventId, { timeZone, ctx } = {}) {
  ctx = await withCtx(supabase, eventId, ctx)
  const data = await loadHotel(supabase, ctx)
  return { buffer: await renderPdf(h(HotelDoc, { ctx, data, timeZone })), missing: data.missing }
}

export const PACKET_DOCUMENTS = [
  ['01 Schedule.pdf', generateSchedule],
  ['02 Arrivals.pdf', generateArrivals],
  ['03 Departures.pdf', generateDepartures],
  ['04 Rentals.pdf', generateRentals],
  ['05 Hotel.pdf', generateHotel],
]

// Builds one event's folder of PDFs and returns it zipped. For several events, add each event's folder to one JSZip.
export async function buildEventPacket(supabase, eventId, { timeZone } = {}) {
  const ctx = await loadEventContext(supabase, eventId)
  const folder = packetFolderName(ctx)
  const results = []
  for (const [, gen] of PACKET_DOCUMENTS) results.push(await gen(supabase, eventId, { timeZone, ctx })) // sequential: react-pdf is CPU heavy
  const zip = new JSZip()
  PACKET_DOCUMENTS.forEach(([name], i) => zip.file(`${folder}/${name}`, results[i].buffer))
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
  return { zip: bytes, folder, fileName: `${folder}.zip`, missing: results.flatMap(r => r.missing) }
}
