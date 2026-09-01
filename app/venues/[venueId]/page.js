'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { IconMapPin, IconPencil, IconLayoutDashboard, IconBuildingStadium } from '@tabler/icons-react'
import { getSupabase } from '../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { useNav } from '../../../context/NavContext'
import { buildNavEntry } from '../../../lib/navigate'

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

const formatAddress = (v) => v?.full_address || v?.address || [v?.city, v?.state, v?.country].filter(Boolean).join(', ') || '—'

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

const SECTION_INPUT = { fontSize: 14, padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }

const SECTION_LABEL = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

const FIELD_VALUE = { fontSize: 14, color: 'var(--text-primary)' }

const FIELD_EMPTY = { fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }


const hoverBlue = e => { e.currentTarget.style.background = 'rgba(26,86,219,0.08)' }
const unhoverBlue = e => { e.currentTarget.style.background = 'transparent' }

const CONTACT_ROLES = [
  { key: 'building_manager', label: 'Building Manager' },
  { key: 'event_manager', label: 'Event Manager' },
  { key: 'production_manager', label: 'Production Manager' },
  { key: 'marketing_manager', label: 'Marketing Manager' },
  { key: 'box_office_manager', label: 'Box Office Manager' },
  { key: 'security_manager', label: 'Security Manager' },
]

function SectionTile({ title, editing, onEdit, onSave, onCancel, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)' }}>{title}</div>
        {!editing ? (
          <div
            onClick={onEdit}
            style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-info)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <IconPencil size={14} stroke={1.5} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: '#FFD60A', color: '#0a1628', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Editing</span>
            <span onClick={onSave} style={{ background: '#00D084', color: '#0a1628', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, cursor: 'pointer' }}>Save Changes</span>
            <span onClick={onCancel} style={{ fontSize: 15, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</span>
          </div>
        )}
      </div>
      <div style={{ ...GLASS, padding: '18px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function BoolField({ label, value, editing, formKey, form, setForm }) {
  if (editing) return (
    <div>
      <label style={SECTION_LABEL}>{label}</label>
      <select value={form[formKey] ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, [formKey]: e.target.value === 'yes' }))} style={SECTION_INPUT}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  )
  return (
    <div>
      <label style={SECTION_LABEL}>{label}</label>
      <div style={value ? { ...FIELD_VALUE, color: 'var(--color-success)' } : FIELD_EMPTY}>{value === null || value === undefined ? '—' : value ? 'Yes' : 'No'}</div>
    </div>
  )
}

function TextField({ label, value, editing, formKey, form, setForm, placeholder, multiline, span }) {
  if (editing) return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label style={SECTION_LABEL}>{label}</label>
      {multiline
        ? <textarea value={form[formKey]} onChange={e => setForm(p => ({ ...p, [formKey]: e.target.value }))} style={{ ...SECTION_INPUT, minHeight: 80, resize: 'vertical' }} placeholder={placeholder} />
        : <input value={form[formKey]} onChange={e => setForm(p => ({ ...p, [formKey]: e.target.value }))} style={SECTION_INPUT} placeholder={placeholder} />
      }
    </div>
  )
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label style={SECTION_LABEL}>{label}</label>
      <div style={value ? FIELD_VALUE : FIELD_EMPTY}>{value || '—'}</div>
    </div>
  )
}

export default function VenuePage() {
  const router = useRouter()
  const { venueId } = useParams()
  const { setNav, clearNav, pushNav } = useNav()
  const [venue, setVenue] = useState(null)
  const [pastEvents, setPastEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  const [editingBasic, setEditingBasic] = useState(false)
  const [basicForm, setBasicForm] = useState({})
  const [editingPersonnel, setEditingPersonnel] = useState(false)
  const [personnelForm, setPersonnelForm] = useState({})
  const [editingBuilding, setEditingBuilding] = useState(false)
  const [buildingForm, setBuildingForm] = useState({})
  const [editingTunnel, setEditingTunnel] = useState(false)
  const [tunnelForm, setTunnelForm] = useState({})
  const [editingPits, setEditingPits] = useState(false)
  const [pitsForm, setPitsForm] = useState({})
  const [editingFloor, setEditingFloor] = useState(false)
  const [floorForm, setFloorForm] = useState({})
  const [editingOffices, setEditingOffices] = useState(false)
  const [officesForm, setOfficesForm] = useState({})
  const [editingLighting, setEditingLighting] = useState(false)
  const [lightingForm, setLightingForm] = useState({})
  const [editingPyro, setEditingPyro] = useState(false)
  const [pyroForm, setPyroForm] = useState({})
  const [editingOther, setEditingOther] = useState(false)
  const [otherForm, setOtherForm] = useState({})

  const fetchVenue = async () => {
    const supabase = getSupabase()
    const [venueRes, eventsRes] = await Promise.all([
      supabase.from('venues').select('*').eq('id', venueId).single(),
      supabase.from('events').select('id, city, state, country, load_in_date, status, tour_id, tours(name, color)').eq('venue_id', venueId).order('load_in_date', { ascending: false }),
    ])
    if (!venueRes.error) setVenue(venueRes.data)
    if (!eventsRes.error) setPastEvents(eventsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchVenue() }, [venueId])

  useEffect(() => {
    if (!venue) return
    setNav({
      backLabel: 'Venues',
      backHref: '/venues',
      title: venue.name,
      activeTab: 'overview',
      onTabChange: () => {},
      items: [
        { label: 'Overview', tab: 'overview', icon: IconLayoutDashboard },
      ],
    })
    pushNav(buildNavEntry(
      `/venues/${venueId}`,
      venue.name,
      'venue'
    ))
    return () => clearNav()
  }, [venue])

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

  useEffect(() => {
    if (!venue) return
    setBasicForm({ name: venue.name||'', venue_type: venue.venue_type||'', capacity: venue.capacity||'', website: venue.website||'', address: venue.address||'', full_address: venue.full_address||'', city: venue.city||'', state: venue.state||'', country: venue.country||'', region: venue.region||'' })
    setPersonnelForm({ contact_building_manager: venue.contact_building_manager||'', contact_building_manager_phone: venue.contact_building_manager_phone||'', contact_building_manager_email: venue.contact_building_manager_email||'', contact_event_manager: venue.contact_event_manager||'', contact_event_manager_phone: venue.contact_event_manager_phone||'', contact_event_manager_email: venue.contact_event_manager_email||'', contact_production_manager: venue.contact_production_manager||'', contact_production_manager_phone: venue.contact_production_manager_phone||'', contact_production_manager_email: venue.contact_production_manager_email||'', contact_marketing_manager: venue.contact_marketing_manager||'', contact_marketing_manager_phone: venue.contact_marketing_manager_phone||'', contact_marketing_manager_email: venue.contact_marketing_manager_email||'', contact_box_office_manager: venue.contact_box_office_manager||'', contact_box_office_manager_phone: venue.contact_box_office_manager_phone||'', contact_box_office_manager_email: venue.contact_box_office_manager_email||'', contact_security_manager: venue.contact_security_manager||'', contact_security_manager_phone: venue.contact_security_manager_phone||'', contact_security_manager_email: venue.contact_security_manager_email||'' })
    setBuildingForm({ has_retractable_seats: venue.has_retractable_seats||false, seating_capacity_retracted: venue.seating_capacity_retracted||'', height_floor_to_first_row: venue.height_floor_to_first_row||'', floor_dimensions_retracted: venue.floor_dimensions_retracted||'', floor_dimensions_fixed: venue.floor_dimensions_fixed||'', height_floor_to_ceiling: venue.height_floor_to_ceiling||'', center_hung_video_board: venue.center_hung_video_board||false, video_board_retractable: venue.video_board_retractable||false, video_board_trim_height: venue.video_board_trim_height||'', video_board_rigging: venue.video_board_rigging||false, guest_entry_point: venue.guest_entry_point||'' })
    setTunnelForm({ tunnel_dimensions: venue.tunnel_dimensions||'', tunnel_door_dimensions: venue.tunnel_door_dimensions||'', tunnel_count: venue.tunnel_count||'', tunnel_can_stage_cars: venue.tunnel_can_stage_cars||false, tunnel_obstructions: venue.tunnel_obstructions||'', tunnel_notes: venue.tunnel_notes||'' })
    setPitsForm({ boh_staging_location: venue.boh_staging_location||'', boh_secured: venue.boh_secured||false, boh_covered: venue.boh_covered||false, boh_dimensions: venue.boh_dimensions||'', boh_electrical: venue.boh_electrical||false, boh_cost: venue.boh_cost||'', boh_employee_access: venue.boh_employee_access||false })
    setFloorForm({ floor_longest_diagonal: venue.floor_longest_diagonal||'', floor_surface: venue.floor_surface||'', floor_under_surface: venue.floor_under_surface||'', floor_ice_capability: venue.floor_ice_capability||false, floor_dashers_removed: venue.floor_dashers_removed||false, floor_ice_dams: venue.floor_ice_dams||'', floor_electrical_outlets: venue.floor_electrical_outlets||'', floor_weight_limits: venue.floor_weight_limits||'', floor_restricted_areas: venue.floor_restricted_areas||'', floor_foh_position: venue.floor_foh_position||'' })
    setOfficesForm({ dressing_room_count: venue.dressing_room_count||'', has_dedicated_internet: venue.has_dedicated_internet||false, internet_type: venue.internet_type||'', internet_extra_cost: venue.internet_extra_cost||false, dressing_rooms_lockable: venue.dressing_rooms_lockable||false })
    setLightingForm({ lighting_capabilities: venue.lighting_capabilities||'', lighting_warmup_time: venue.lighting_warmup_time||'', house_lights_controllable: venue.house_lights_controllable||false, house_lights_location: venue.house_lights_location||'', inhouse_video_boards: venue.inhouse_video_boards||'', spotlights_count: venue.spotlights_count||'' })
    setPyroForm({ pyro_allowed: venue.pyro_allowed||false, pyro_used_before: venue.pyro_used_before||false, lasers_used_before: venue.lasers_used_before||false, pyro_permit_required: venue.pyro_permit_required||false, pyro_permit_contact: venue.pyro_permit_contact||'' })
    setOtherForm({ has_forklifts: venue.has_forklifts||false, has_dumpsters: venue.has_dumpsters||false, has_jersey_barriers: venue.has_jersey_barriers||false, fuel_storage_location: venue.fuel_storage_location||'', fire_extinguishers_available: venue.fire_extinguishers_available||false, fire_watch_required: venue.fire_watch_required||false, ambulance_on_request: venue.ambulance_on_request||false, fireproof_plastic_required: venue.fireproof_plastic_required||false, air_handling_system: venue.air_handling_system||'', air_handling_pyro_mode: venue.air_handling_pyro_mode||false, air_quality_issues: venue.air_quality_issues||'', vip_suites: venue.vip_suites||'', catering_available: venue.catering_available||false, catering_buyout_available: venue.catering_buyout_available||false, catering_contact: venue.catering_contact||'' })
  }, [venue])

  const saveSection = async (updates, onDone) => {
    const supabase = getSupabase()
    await supabase.from('venues').update(updates).eq('id', venueId)
    onDone()
    fetchVenue()
  }

  useEffect(() => {
    if (!editingBasic || !addressInputRef.current || !window.google) return
    if (autocompleteRef.current) return
    autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, { types: ['establishment', 'geocode'] })
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (!place) return
      const full = place.formatted_address || ''
      const name = place.name || ''
      setBasicForm(p => ({ ...p, full_address: full, address: name }))
      if (addressInputRef.current) addressInputRef.current.value = full
    })
    return () => { autocompleteRef.current = null }
  }, [editingBasic])

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const hasMap = venue && (venue.latitude || venue.longitude)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '4px 4px 0' }}>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  )

  if (!venue) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '4px 4px 0' }}>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Venue not found.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hero header */}
          <div style={{ ...GLASS, padding: '16px 20px', marginBottom: 0, display: 'flex', flexDirection: 'row', gap: 10 }}>
            <IconMapPin size={20} color="var(--color-info)" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{venue.name}</div>
                {venue.region && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 10, background: 'rgba(26,86,219,0.10)', color: 'var(--color-info)', border: '0.5px solid rgba(26,86,219,0.3)' }}>{venue.region}</span>}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {formatAddress(venue)}
              </div>
            </div>
          </div>

          {/* ROW 2 — Basic Info + Venue Personnel (left) / Map (right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SectionTile
                title="Basic Info"
                editing={editingBasic}
                onEdit={() => setEditingBasic(true)}
                onCancel={() => setEditingBasic(false)}
                onSave={() => saveSection({
                  name: basicForm.name || null,
                  venue_type: basicForm.venue_type || null,
                  capacity: basicForm.capacity ? parseInt(basicForm.capacity, 10) : null,
                  website: basicForm.website || null,
                  address: basicForm.address || null,
                  full_address: basicForm.full_address || null,
                  region: basicForm.region || null,
                }, () => setEditingBasic(false))}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <div>
                    <label style={SECTION_LABEL}>Address</label>
                    {editingBasic ? (
                      <input
                        ref={addressInputRef}
                        defaultValue={basicForm.full_address || basicForm.address || ''}
                        onChange={e => setBasicForm(p => ({ ...p, full_address: e.target.value }))}
                        style={SECTION_INPUT}
                        placeholder="Search for address..."
                      />
                    ) : (
                      <div style={(venue.full_address || venue.address || venue.city || venue.state || venue.country) ? FIELD_VALUE : FIELD_EMPTY}>
                        {formatAddress(venue)}
                      </div>
                    )}
                  </div>

                  <TextField label="Venue Type" value={venue.venue_type} editing={editingBasic} formKey="venue_type" form={basicForm} setForm={setBasicForm} />

                  {editingBasic ? (
                    <div>
                      <label style={SECTION_LABEL}>Capacity</label>
                      <input type="text" inputMode="numeric" value={basicForm.capacity} onChange={e => setBasicForm(p => ({ ...p, capacity: e.target.value }))} style={SECTION_INPUT} />
                    </div>
                  ) : (
                    <div>
                      <label style={SECTION_LABEL}>Capacity</label>
                      <div style={venue.capacity ? FIELD_VALUE : FIELD_EMPTY}>{venue.capacity ? Number(venue.capacity).toLocaleString() : '—'}</div>
                    </div>
                  )}

                  {editingBasic ? (
                    <TextField label="Website" value={venue.website} editing formKey="website" form={basicForm} setForm={setBasicForm} />
                  ) : (
                    <div>
                      <label style={SECTION_LABEL}>Website</label>
                      {venue.website ? <a href={venue.website} target="_blank" rel="noopener noreferrer" style={{ ...FIELD_VALUE, color: 'var(--color-info)', textDecoration: 'none' }}>{venue.website}</a> : <div style={FIELD_EMPTY}>—</div>}
                    </div>
                  )}

                  <TextField label="Region" value={venue.region} editing={editingBasic} formKey="region" form={basicForm} setForm={setBasicForm} />
                </div>
              </SectionTile>

              <SectionTile
                title="Venue Personnel"
                editing={editingPersonnel}
                onEdit={() => setEditingPersonnel(true)}
                onCancel={() => setEditingPersonnel(false)}
                onSave={() => saveSection(personnelForm, () => setEditingPersonnel(false))}
              >
                <div>
                  {CONTACT_ROLES.map((role, idx) => {
                    const nameKey = `contact_${role.key}`
                    const phoneKey = `contact_${role.key}_phone`
                    const emailKey = `contact_${role.key}_email`
                    const isLast = idx === CONTACT_ROLES.length - 1
                    const rowStyle = { padding: '6px 0', borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)' }
                    if (editingPersonnel) {
                      return (
                        <div key={role.key} style={rowStyle}>
                          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{role.label}</div>
                            <input value={personnelForm[nameKey] || ''} onChange={e => setPersonnelForm(p => ({ ...p, [nameKey]: e.target.value }))} style={SECTION_INPUT} placeholder="Name" />
                            <input value={personnelForm[emailKey] || ''} onChange={e => setPersonnelForm(p => ({ ...p, [emailKey]: e.target.value }))} style={SECTION_INPUT} placeholder="Email" />
                            <input value={personnelForm[phoneKey] || ''} onChange={e => setPersonnelForm(p => ({ ...p, [phoneKey]: e.target.value }))} style={SECTION_INPUT} placeholder="Phone" />
                          </div>
                        </div>
                      )
                    }
                    const name = venue[nameKey]
                    const phone = venue[phoneKey]
                    const email = venue[emailKey]
                    return (
                      <div key={role.key} style={rowStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{role.label}</div>
                          <div style={{ fontSize: 13, color: name ? 'var(--text-primary)' : 'var(--text-muted)' }}>{name || '—'}</div>
                          <div>
                            {email ? <a href={`mailto:${email}`} style={{ fontSize: 13, color: 'var(--color-info)', textDecoration: 'none' }}>{email}</a> : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
                          </div>
                          <div style={{ fontSize: 13, color: phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>{phone || '—'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionTile>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>Map</div>
              <div style={{ ...GLASS, flex: 1, overflow: 'hidden' }}>
                {hasMap ? (
                  <>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    {!mapsLoaded && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                        Loading map...
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                    No location set.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3 — Building Info + Floor Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionTile
              title="Building Info"
              editing={editingBuilding}
              onEdit={() => setEditingBuilding(true)}
              onCancel={() => setEditingBuilding(false)}
              onSave={() => saveSection(buildingForm, () => setEditingBuilding(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <BoolField label="Has Retractable Seats" value={venue.has_retractable_seats} editing={editingBuilding} formKey="has_retractable_seats" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Seating Capacity (Retracted)" value={venue.seating_capacity_retracted} editing={editingBuilding} formKey="seating_capacity_retracted" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Height Floor to First Row" value={venue.height_floor_to_first_row} editing={editingBuilding} formKey="height_floor_to_first_row" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Floor Dimensions (Retracted)" value={venue.floor_dimensions_retracted} editing={editingBuilding} formKey="floor_dimensions_retracted" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Floor Dimensions (Fixed)" value={venue.floor_dimensions_fixed} editing={editingBuilding} formKey="floor_dimensions_fixed" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Height Floor to Ceiling" value={venue.height_floor_to_ceiling} editing={editingBuilding} formKey="height_floor_to_ceiling" form={buildingForm} setForm={setBuildingForm} />
                <BoolField label="Center Hung Video Board" value={venue.center_hung_video_board} editing={editingBuilding} formKey="center_hung_video_board" form={buildingForm} setForm={setBuildingForm} />
                <BoolField label="Video Board Retractable" value={venue.video_board_retractable} editing={editingBuilding} formKey="video_board_retractable" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Video Board Trim Height" value={venue.video_board_trim_height} editing={editingBuilding} formKey="video_board_trim_height" form={buildingForm} setForm={setBuildingForm} />
                <BoolField label="Video Board Has Rigging" value={venue.video_board_rigging} editing={editingBuilding} formKey="video_board_rigging" form={buildingForm} setForm={setBuildingForm} />
                <TextField label="Guest Entry Point" value={venue.guest_entry_point} editing={editingBuilding} formKey="guest_entry_point" form={buildingForm} setForm={setBuildingForm} span={2} />
              </div>
            </SectionTile>

            <SectionTile
              title="Floor Area"
              editing={editingFloor}
              onEdit={() => setEditingFloor(true)}
              onCancel={() => setEditingFloor(false)}
              onSave={() => saveSection(floorForm, () => setEditingFloor(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <TextField label="Longest Diagonal" value={venue.floor_longest_diagonal} editing={editingFloor} formKey="floor_longest_diagonal" form={floorForm} setForm={setFloorForm} />
                <TextField label="Floor Surface" value={venue.floor_surface} editing={editingFloor} formKey="floor_surface" form={floorForm} setForm={setFloorForm} />
                <TextField label="What's Under the Floor" value={venue.floor_under_surface} editing={editingFloor} formKey="floor_under_surface" form={floorForm} setForm={setFloorForm} />
                <BoolField label="Ice Making Capability" value={venue.floor_ice_capability} editing={editingFloor} formKey="floor_ice_capability" form={floorForm} setForm={setFloorForm} />
                <BoolField label="Dashers Removed" value={venue.floor_dashers_removed} editing={editingFloor} formKey="floor_dashers_removed" form={floorForm} setForm={setFloorForm} />
                <TextField label="Ice Dams / Pits" value={venue.floor_ice_dams} editing={editingFloor} formKey="floor_ice_dams" form={floorForm} setForm={setFloorForm} />
                <TextField label="Electrical Outlets" value={venue.floor_electrical_outlets} editing={editingFloor} formKey="floor_electrical_outlets" form={floorForm} setForm={setFloorForm} />
                <TextField label="Weight Limits" value={venue.floor_weight_limits} editing={editingFloor} formKey="floor_weight_limits" form={floorForm} setForm={setFloorForm} />
                <TextField label="Restricted Areas" value={venue.floor_restricted_areas} editing={editingFloor} formKey="floor_restricted_areas" form={floorForm} setForm={setFloorForm} span={2} />
                <TextField label="FOH Position" value={venue.floor_foh_position} editing={editingFloor} formKey="floor_foh_position" form={floorForm} setForm={setFloorForm} span={2} />
              </div>
            </SectionTile>
          </div>

          {/* ROW 4 — Pits / Paddock / Parking + Tunnel Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionTile
              title="Pits / Paddock / Parking"
              editing={editingPits}
              onEdit={() => setEditingPits(true)}
              onCancel={() => setEditingPits(false)}
              onSave={() => saveSection(pitsForm, () => setEditingPits(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <TextField label="BOH Staging Location" value={venue.boh_staging_location} editing={editingPits} formKey="boh_staging_location" form={pitsForm} setForm={setPitsForm} span={2} />
                <BoolField label="Secured & Fenced" value={venue.boh_secured} editing={editingPits} formKey="boh_secured" form={pitsForm} setForm={setPitsForm} />
                <BoolField label="Covered / Indoors" value={venue.boh_covered} editing={editingPits} formKey="boh_covered" form={pitsForm} setForm={setPitsForm} />
                <TextField label="Dimensions" value={venue.boh_dimensions} editing={editingPits} formKey="boh_dimensions" form={pitsForm} setForm={setPitsForm} />
                <BoolField label="Has Electrical Power" value={venue.boh_electrical} editing={editingPits} formKey="boh_electrical" form={pitsForm} setForm={setPitsForm} />
                <TextField label="Cost to Use" value={venue.boh_cost} editing={editingPits} formKey="boh_cost" form={pitsForm} setForm={setPitsForm} />
                <BoolField label="Employee Access During Show" value={venue.boh_employee_access} editing={editingPits} formKey="boh_employee_access" form={pitsForm} setForm={setPitsForm} />
              </div>
            </SectionTile>

            <SectionTile
              title="Tunnel Info"
              editing={editingTunnel}
              onEdit={() => setEditingTunnel(true)}
              onCancel={() => setEditingTunnel(false)}
              onSave={() => saveSection(tunnelForm, () => setEditingTunnel(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <TextField label="Tunnel Dimensions" value={venue.tunnel_dimensions} editing={editingTunnel} formKey="tunnel_dimensions" form={tunnelForm} setForm={setTunnelForm} />
                <TextField label="Tunnel Door Dimensions" value={venue.tunnel_door_dimensions} editing={editingTunnel} formKey="tunnel_door_dimensions" form={tunnelForm} setForm={setTunnelForm} />
                <TextField label="Number of Tunnels" value={venue.tunnel_count} editing={editingTunnel} formKey="tunnel_count" form={tunnelForm} setForm={setTunnelForm} />
                <BoolField label="Can Stage Cars" value={venue.tunnel_can_stage_cars} editing={editingTunnel} formKey="tunnel_can_stage_cars" form={tunnelForm} setForm={setTunnelForm} />
                <TextField label="Obstructions" value={venue.tunnel_obstructions} editing={editingTunnel} formKey="tunnel_obstructions" form={tunnelForm} setForm={setTunnelForm} span={2} />
                <TextField label="Notes" value={venue.tunnel_notes} editing={editingTunnel} formKey="tunnel_notes" form={tunnelForm} setForm={setTunnelForm} multiline span={2} />
              </div>
            </SectionTile>
          </div>

          {/* ROW 5 — Offices & Dressing Rooms + Lighting & Video + Pyro & Lasers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <SectionTile
              title="Offices & Dressing Rooms"
              editing={editingOffices}
              onEdit={() => setEditingOffices(true)}
              onCancel={() => setEditingOffices(false)}
              onSave={() => saveSection(officesForm, () => setEditingOffices(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <TextField label="Number of Dressing Rooms" value={venue.dressing_room_count} editing={editingOffices} formKey="dressing_room_count" form={officesForm} setForm={setOfficesForm} />
                <BoolField label="Rooms Lockable" value={venue.dressing_rooms_lockable} editing={editingOffices} formKey="dressing_rooms_lockable" form={officesForm} setForm={setOfficesForm} />
                <BoolField label="Has Dedicated Internet" value={venue.has_dedicated_internet} editing={editingOffices} formKey="has_dedicated_internet" form={officesForm} setForm={setOfficesForm} />
                <TextField label="Internet Type" value={venue.internet_type} editing={editingOffices} formKey="internet_type" form={officesForm} setForm={setOfficesForm} />
                <BoolField label="Extra Cost for Internet" value={venue.internet_extra_cost} editing={editingOffices} formKey="internet_extra_cost" form={officesForm} setForm={setOfficesForm} />
              </div>
            </SectionTile>

            <SectionTile
              title="Lighting & Video"
              editing={editingLighting}
              onEdit={() => setEditingLighting(true)}
              onCancel={() => setEditingLighting(false)}
              onSave={() => saveSection(lightingForm, () => setEditingLighting(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <TextField label="Lighting Capabilities" value={venue.lighting_capabilities} editing={editingLighting} formKey="lighting_capabilities" form={lightingForm} setForm={setLightingForm} span={2} />
                <TextField label="Warm-up / Cool-down Times" value={venue.lighting_warmup_time} editing={editingLighting} formKey="lighting_warmup_time" form={lightingForm} setForm={setLightingForm} />
                <BoolField label="House Lights Controllable" value={venue.house_lights_controllable} editing={editingLighting} formKey="house_lights_controllable" form={lightingForm} setForm={setLightingForm} />
                <TextField label="House Lights Location" value={venue.house_lights_location} editing={editingLighting} formKey="house_lights_location" form={lightingForm} setForm={setLightingForm} />
                <TextField label="In-house Video Boards" value={venue.inhouse_video_boards} editing={editingLighting} formKey="inhouse_video_boards" form={lightingForm} setForm={setLightingForm} span={2} />
                <TextField label="Spotlight Count" value={venue.spotlights_count} editing={editingLighting} formKey="spotlights_count" form={lightingForm} setForm={setLightingForm} />
              </div>
            </SectionTile>

            <SectionTile
              title="Pyro & Lasers"
              editing={editingPyro}
              onEdit={() => setEditingPyro(true)}
              onCancel={() => setEditingPyro(false)}
              onSave={() => saveSection(pyroForm, () => setEditingPyro(false))}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <BoolField label="Pyro / Cold Sparks Allowed" value={venue.pyro_allowed} editing={editingPyro} formKey="pyro_allowed" form={pyroForm} setForm={setPyroForm} />
                <BoolField label="Pyro Used Before" value={venue.pyro_used_before} editing={editingPyro} formKey="pyro_used_before" form={pyroForm} setForm={setPyroForm} />
                <BoolField label="Lasers Used Before" value={venue.lasers_used_before} editing={editingPyro} formKey="lasers_used_before" form={pyroForm} setForm={setPyroForm} />
                <BoolField label="Permit Required" value={venue.pyro_permit_required} editing={editingPyro} formKey="pyro_permit_required" form={pyroForm} setForm={setPyroForm} />
                <TextField label="Permit Contact" value={venue.pyro_permit_contact} editing={editingPyro} formKey="pyro_permit_contact" form={pyroForm} setForm={setPyroForm} span={2} />
              </div>
            </SectionTile>
          </div>

          {/* ROW 6 — Other */}
          <SectionTile
            title="Other"
            editing={editingOther}
            onEdit={() => setEditingOther(true)}
            onCancel={() => setEditingOther(false)}
            onSave={() => saveSection(otherForm, () => setEditingOther(false))}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px' }}>
              <BoolField label="Forklifts Available" value={venue.has_forklifts} editing={editingOther} formKey="has_forklifts" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Dumpsters Available" value={venue.has_dumpsters} editing={editingOther} formKey="has_dumpsters" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Jersey Barriers Available" value={venue.has_jersey_barriers} editing={editingOther} formKey="has_jersey_barriers" form={otherForm} setForm={setOtherForm} />
              <TextField label="Fuel Storage Location" value={venue.fuel_storage_location} editing={editingOther} formKey="fuel_storage_location" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Fire Extinguishers Available" value={venue.fire_extinguishers_available} editing={editingOther} formKey="fire_extinguishers_available" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Fire Watch Required" value={venue.fire_watch_required} editing={editingOther} formKey="fire_watch_required" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Ambulance on Request" value={venue.ambulance_on_request} editing={editingOther} formKey="ambulance_on_request" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Fireproof Plastic Required" value={venue.fireproof_plastic_required} editing={editingOther} formKey="fireproof_plastic_required" form={otherForm} setForm={setOtherForm} />
              <TextField label="Air Handling System" value={venue.air_handling_system} editing={editingOther} formKey="air_handling_system" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Air Handling Pyro Mode" value={venue.air_handling_pyro_mode} editing={editingOther} formKey="air_handling_pyro_mode" form={otherForm} setForm={setOtherForm} />
              <TextField label="Air Quality Issues" value={venue.air_quality_issues} editing={editingOther} formKey="air_quality_issues" form={otherForm} setForm={setOtherForm} />
              <TextField label="VIP Suites" value={venue.vip_suites} editing={editingOther} formKey="vip_suites" form={otherForm} setForm={setOtherForm} span={3} />
              <BoolField label="Catering Available" value={venue.catering_available} editing={editingOther} formKey="catering_available" form={otherForm} setForm={setOtherForm} />
              <BoolField label="Catering Buy-out Option" value={venue.catering_buyout_available} editing={editingOther} formKey="catering_buyout_available" form={otherForm} setForm={setOtherForm} />
              <TextField label="Catering Contact" value={venue.catering_contact} editing={editingOther} formKey="catering_contact" form={otherForm} setForm={setOtherForm} />
            </div>
          </SectionTile>

          {/* Event History */}
          {pastEvents.length > 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>Event History ({pastEvents.length})</div>
              <div style={{ ...GLASS, padding: '18px 20px' }}>
                {pastEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', cursor: 'pointer', borderTop: i === 0 ? 'none' : '0.5px solid var(--border-default)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.tours?.color || 'var(--color-info)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{ev.tours?.name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{formatLocation(ev.city, ev.state, ev.country, 'compact')}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(ev.load_in_date)}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', color: (STATUS_PILL[ev.status] || STATUS_PILL.tentative).color, background: (STATUS_PILL[ev.status] || STATUS_PILL.tentative).background, border: `1px solid ${(STATUS_PILL[ev.status] || STATUS_PILL.tentative).border}` }}>
                        {fmtStatus(ev.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
