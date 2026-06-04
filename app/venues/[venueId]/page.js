'use client'


import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

export default function VenuePage() {
  const router = useRouter()
  const { venueId } = useParams()
  const [venue, setVenue] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingContact, setAddingContact] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', title: '', phone: '', email: '', notes: '' })
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [venueRes, contactsRes] = await Promise.all([
        supabase.from('venues').select('*').eq('id', venueId).single(),
        supabase.from('venue_contacts').select('*').eq('venue_id', venueId).order('created_at', { ascending: true }),
      ])
      if (!venueRes.error) setVenue(venueRes.data)
      if (!contactsRes.error) setContacts(contactsRes.data)
      setLoading(false)
    }
    fetchData()
  }, [venueId])

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

  const inputStyle = {
    fontFamily: 'Rubik, sans-serif',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 7,
    border: '0.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid var(--glass-border)' }}>
      {title}
    </div>
  )

  const field = (label, value) => value ? (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  ) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!venue) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Venue not found.</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => router.push('/venues')} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              ← Venues
            </button>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{venue.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/venues/${venueId}/edit`)}
            style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Edit Venue
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Address */}
          {venue.address && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              {sectionLabel('Address')}
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {venue.address}<br />
                {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
              </div>
            </div>
          )}

          {/* Floor & Structure */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Floor & Structure')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {field('Floor Size', venue.floor_size)}
              {field('Surface Coating', venue.surface_coating)}
              {field('Max Height', venue.max_height)}
              {field('Floor Weight Capacity', venue.floor_weight_capacity)}
              {field('Slope Angle', venue.slope_angle)}
              {field('Video Board Location', venue.video_board_location)}
            </div>
          </div>

          {/* Access & Logistics */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Access & Logistics')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {field('Tunnel Dimensions', venue.tunnel_dims)}
              {field('Tunnel Position', venue.tunnel_position)}
              {field('Loading Docks', venue.loading_docks)}
              {field('Pit / Trailer Parking', venue.pit_trailer_parking)}
            </div>
          </div>

          {/* Rules & Restrictions */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            {sectionLabel('Rules & Restrictions')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {field('Union Status', venue.union_status)}
              {field('Permits Required', venue.permits)}
              {field('Noise Restrictions', venue.noise_restrictions)}
            </div>
          </div>

          {/* Contacts */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                Contacts
              </div>
              {!addingContact && (
                <button className="btn-primary" onClick={() => setAddingContact(true)} style={{ fontSize: 12, padding: '5px 12px' }}>
                  + Add Contact
                </button>
              )}
            </div>

            {addingContact && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid var(--glass-border)', borderRadius: 10, padding: '16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name *</label>
                    <input style={inputStyle} placeholder="Full name" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title</label>
                    <input style={inputStyle} placeholder="e.g. Event Manager" value={newContact.title} onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
                    <input style={inputStyle} placeholder="Phone number" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
                    <input style={inputStyle} placeholder="Email address" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                  <input style={inputStyle} placeholder="Optional notes" value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAddingContact(false); setNewContact({ name: '', title: '', phone: '', email: '', notes: '' }) }} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleAddContact} disabled={savingContact}>
                    {savingContact ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 && !addingContact && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No contacts added yet.</div>
            )}

            {contacts.map(contact => (
              <div key={contact.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                    {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{contact.name}</div>
                    {contact.title && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{contact.title}</div>}
                    <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.phone}</a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.email}</a>
                      )}
                    </div>
                    {contact.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{contact.notes}</div>}
                  </div>
                </div>
                <div
                  onClick={() => handleDeleteContact(contact.id)}
                  style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 4px', opacity: deletingId === contact.id ? 0.3 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >×</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {venue.notes && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              {sectionLabel('Notes')}
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{venue.notes}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}