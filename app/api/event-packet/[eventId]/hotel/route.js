import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { generateHotel } from '@/lib/packet'
import { loadEventContext } from '@/lib/packet/data'
import { packetFolderName } from '@/lib/packet/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Just the hotel page of the Event Packet (the rooming list), as one PDF. Runs as the signed-in user.
export async function GET(request, { params }) {
  const { eventId } = await params
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const ctx = await loadEventContext(supabase, eventId)
    const tz = new URL(request.url).searchParams.get('tz') || undefined
    const { buffer } = await generateHotel(supabase, eventId, { timeZone: tz, ctx })
    const fileName = `${packetFolderName(ctx)} Rooming List.pdf`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rooming-list.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('rooming list pdf failed', e)
    return NextResponse.json({ error: e.message || 'Could not build the rooming list' }, { status: e.status || 500 })
  }
}
