import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { buildEventPacket } from '@/lib/packet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { eventId } = await params
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const tz = new URL(request.url).searchParams.get('tz') || undefined
    const { zip, fileName, missing } = await buildEventPacket(supabase, eventId, { timeZone: tz })
    return new NextResponse(zip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="packet.zip"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'X-Packet-Missing': encodeURIComponent(JSON.stringify(missing)),
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Packet-Missing',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('event-packet failed', e)
    return NextResponse.json({ error: e.message || 'Could not build the packet' }, { status: e.status || 500 })
  }
}
