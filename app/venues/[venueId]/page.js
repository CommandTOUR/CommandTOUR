'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'

const STATUS_PILL = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: '#FFD60A', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: '#FF9500', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: '#FF3B30', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const fmtStatus = (s) => {
  if (!s) return '—'
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

export default function VenuePage() {
  const router = useRouter()
  const { venueId } = useParams()
  const [venue, setVenue] = useState(null)
  const [contacts, setContacts] = useState([])
  const [pastEvents, setPastEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingContact, setAddingContact] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', title: '', phone: '', email: '', notes: '' })
  const [deletingId, setDeletingId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [venueRes, contactsRes, eventsRes] = await Promise.all([
        supabase.from('venues').select('*').eq('id', venueId).single(),
        supabase.from('venue_contacts').select('*').eq('venue_id', venueId).order('created_at', { ascending: true }),
        supabase.from('events').select('id, city, state, country, load_in_date, status, tour_id, tours(name, color)').eq('venue_id', venueId).order('load_in_date', { ascending: false }),
      ])
      if (!venueRes.error) setVenue(venueRes.data)
      if (!contactsRes.error) setContacts(contactsRes.data)
      if (!eventsRes.error) setPastEvents(eventsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [venueId])

  // Load Google Maps
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return }
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) { existing.addEventListener('load', () => setMapsLoaded(true)); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.dataset.gmaps = 'true'
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Initialize map once venue + maps are ready
  useEffect(() => {
    if (!mapsLoaded || !venue || !mapRef.current || mapInstanceRef.current) return
    if (!venue.latitude && !venue.longitude && !venue.place_id) return

    const initMap = () => {
      if (!mapRef.current) return
      const lat = venue.latitude || 0
      const lng = venue.longitude || 0
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat, lng },
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb5' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2f52' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0a1628' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061020' }] },
          { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d1f3a' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0d1f3a' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a2f52' }] },
        ],
      })

      new window.google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#33FF99',
          fillOpacity: 1,
          strokeColor: '#0a1628',
          strokeWeight: 2,
        },
      })

      mapInstanceRef.current = map
    }

    initMap()
  }, [mapsLoaded, venue])

  const handleCopyAddress = () => {
    const addr = venue.full_address || [venue.address, venue.city, venue.state, venue.country].filter(Boolean).join(', ')
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return
    setSavingContact(true)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('venue_contacts')
      .insert([{ ...newContact, venue_id: venueId }])
      .select()
      .single()
    if (!error) {
      setContacts(prev => [...prev, data])
      setNewContact({ name: '', title: '', phone: '', email: '', notes: '' })
      setAddingContact(false)
    }
    setSavingContact(false)
  }

  const handleDeleteContact = async (contactId) => {
    setDeletingId(contactId)
    const supabase = getSupabase()
    const { error } = await supabase.from('venue_contacts').delete().eq('id', contactId)
    if (!error) setContacts(prev => prev.filter(c => c.id !== contactId))
    setDeletingId(null)
  }

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '8px 12px',
    borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', caretColor: '#33FF99',
    outline: 'none', width: '100%',
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
      {title}
    </div>
  )

  const field = (label, value, key) => value ? (
    <div key={key}>
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#f1f5f9' }}>{value}</div>
    </div>
  ) : null

  const hasMap = venue && (venue.latitude || venue.longitude)

  const customFields = venue?.custom_fields || []
  const customSections = venue?.custom_sections || []
  const floorCustomFields = customFields.filter(f => f.section === 'floor')
  const accessCustomFields = customFields.filter(f => f.section === 'access')
  const rulesCustomFields = customFields.filter(f => f.section === 'rules')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!venue) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Venue not found.</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>

        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/venues')}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ← Venues
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{venue.name}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                {formatLocation(venue.city, venue.state, venue.country, 'full')}
                {venue.region && <span style={{ marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(201,168,76,0.1)', border: '0.5px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>{venue.region}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/venues/${venueId}/edit`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Edit Venue
          </button>
        </div>

        <div style={{ padding: 28 }}>

        {/* Top row — Address + Map + Contacts */}
        <div style={{ display: 'grid', gridTemplateColumns: hasMap ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Address */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Address')}
            {venue.address || venue.city ? (
              <div>
                <div style={{ fontSize: 14, color: '#f1f5f9', lineHeight: 1.8, marginBottom: 12 }}>
                  {venue.address && <div>{venue.address}</div>}
                  <div>{formatLocation(venue.city, venue.state, venue.country, 'full')}</div>
                </div>
                {venue.full_address && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
                    {venue.full_address}
                  </div>
                )}
                <button
                  onClick={handleCopyAddress}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.08)', background: copied ? 'rgba(51,255,153,0.1)' : 'transparent', color: copied ? 'var(--mint)' : '#94a3b8', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {copied ? '✓ Copied' : 'Copy Address'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>No address added yet.</div>
            )}
          </div>

          {/* Map */}
          {hasMap && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, minHeight: 200 }}>
              <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 200 }} />
              {!mapsLoaded && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8', fontSize: 13 }}>
                  Loading map...
                </div>
              )}
            </div>
          )}

          {/* Contacts */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Contacts</div>
              {!addingContact && (
                <button className="btn-primary" onClick={() => setAddingContact(true)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Add Contact</button>
              )}
            </div>

            {addingContact && (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Name *</label>
                    <input style={inputStyle} placeholder="Full name" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Title</label>
                    <input style={inputStyle} placeholder="e.g. Event Manager" value={newContact.title} onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Phone</label>
                    <input style={inputStyle} placeholder="Phone number" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Email</label>
                    <input style={inputStyle} placeholder="Email address" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Notes</label>
                  <input style={inputStyle} placeholder="Optional notes" value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setAddingContact(false); setNewContact({ name: '', title: '', phone: '', email: '', notes: '' }) }}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleAddContact} disabled={savingContact}>
                    {savingContact ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 && !addingContact && (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>No contacts added yet.</div>
            )}

            {contacts.map(contact => (
              <div key={contact.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                    {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{contact.name}</div>
                    {contact.title && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{contact.title}</div>}
                    <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                      {contact.phone && <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.phone}</a>}
                      {contact.email && <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.email}</a>}
                    </div>
                    {contact.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{contact.notes}</div>}
                  </div>
                </div>
                <div
                  onClick={() => handleDeleteContact(contact.id)}
                  style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1, padding: '0 4px', opacity: deletingId === contact.id ? 0.3 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-red)'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >×</div>
              </div>
            ))}
          </div>
        </div>

        {/* Second row — Floor & Structure + Access & Logistics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Floor & Structure')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {field('Floor Size', venue.floor_size)}
              {field('Surface Coating', venue.surface_coating)}
              {field('Max Height', venue.max_height)}
              {field('Floor Weight Capacity', venue.floor_weight_capacity)}
              {field('Slope Angle', venue.slope_angle)}
              {field('Video Board Location', venue.video_board_location)}
              {floorCustomFields.map((f, i) => field(f.label, f.value, `floor-custom-${i}`))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Access & Logistics')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {field('Tunnel Dimensions', venue.tunnel_dims)}
              {field('Tunnel Position', venue.tunnel_position)}
              {field('Loading Docks', venue.loading_docks)}
              {field('Pit / Trailer Parking', venue.pit_trailer_parking)}
              {accessCustomFields.map((f, i) => field(f.label, f.value, `access-custom-${i}`))}
            </div>
          </div>
        </div>

        {/* Rules & Restrictions */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          {sectionLabel('Rules & Restrictions')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {field('Union Status', venue.union_status)}
            {field('Permits Required', venue.permits)}
            {field('Noise Restrictions', venue.noise_restrictions)}
            {rulesCustomFields.map((f, i) => field(f.label, f.value, `rules-custom-${i}`))}
          </div>
        </div>

        {/* Custom sections */}
        {customSections.map((section, i) => (
          <div key={section.id || i} className="glass-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            {sectionLabel(section.title)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {(section.fields || []).map((f, j) => field(f.label, f.value, `custom-section-${i}-${j}`))}
            </div>
          </div>
        ))}

        {/* Event History */}
        {pastEvents.length > 0 && (
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            {sectionLabel(`Event History (${pastEvents.length})`)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {pastEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', cursor: 'pointer', borderBottom: i < pastEvents.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.tours?.color || 'var(--mint)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{ev.tours?.name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{formatLocation(ev.city, ev.state, ev.country, 'compact')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>{fmt(ev.load_in_date)}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', color: (STATUS_PILL[ev.status] || STATUS_PILL.tentative).color, background: (STATUS_PILL[ev.status] || STATUS_PILL.tentative).background, border: `1px solid ${(STATUS_PILL[ev.status] || STATUS_PILL.tentative).border}` }}>
                      {fmtStatus(ev.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {venue.notes && (
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Notes')}
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{venue.notes}</div>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}