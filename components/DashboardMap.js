'use client'

import { useEffect, useRef } from 'react'

const EVENTS = [
  { coords: [-87.6298, 41.8827], color: '#C9A84C', label: 'Chicago', tour: 'HWSS' },
  { coords: [-118.2437, 34.0522], color: '#C9A84C', label: 'Los Angeles', tour: 'HWSS' },
  { coords: [-0.1276, 51.5074], color: '#33FF99', label: 'London', tour: 'Monster Trucks' },
  { coords: [55.2708, 25.2048], color: '#33FF99', label: 'Dubai', tour: 'Monster Trucks' },
  { coords: [151.2093, -33.8688], color: '#FFCC00', label: 'Sydney', tour: 'HWSS AP' },
  { coords: [139.6917, 35.6895], color: '#FFCC00', label: 'Tokyo', tour: 'HWSS AP' },
]

export default function DashboardMap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) return

    import('mapbox-gl').then(mapboxgl => {
      mapboxgl.default.accessToken = token

      const map = new mapboxgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [10, 25],
        zoom: 1.4,
        interactive: true,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.default.AttributionControl({ compact: true }), 'bottom-right')

      map.on('load', () => {
        EVENTS.forEach(ev => {
          const el = document.createElement('div')
          el.style.cssText = `
            width: 12px; height: 12px; border-radius: 50%;
            background: ${ev.color};
            border: 2px solid rgba(255,255,255,0.7);
            box-shadow: 0 0 10px ${ev.color}99, 0 0 4px ${ev.color};
            cursor: pointer;
          `

          const popup = new mapboxgl.default.Popup({ offset: 14, closeButton: false })
            .setHTML(`
              <div style="font-family:'Inter',sans-serif;font-size:12px;font-weight:500;
                color:#fff;background:#0d1f3a;border:0.5px solid rgba(255,255,255,0.15);
                border-radius:7px;padding:6px 10px;white-space:nowrap;">
                <div style="color:${ev.color};font-size:10px;text-transform:uppercase;
                  letter-spacing:0.07em;margin-bottom:2px;">${ev.tour}</div>
                ${ev.label}
              </div>
            `)

          new mapboxgl.default.Marker({ element: el })
            .setLngLat(ev.coords)
            .setPopup(popup)
            .addTo(map)
        })
      })

      mapInstance.current = map
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', height: 220, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }} className="glass-card">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />

      {/* Stats overlay */}
      <div style={{
        position: 'absolute', bottom: 14, left: 16,
        display: 'flex', gap: 10, zIndex: 2, pointerEvents: 'none',
      }}>
        {[
          { value: '3', label: 'Active Tours' },
          { value: '12', label: 'Events This Month' },
          { value: '5', label: 'Cities Active' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(10,22,40,0.82)',
            border: '0.5px solid var(--glass-border)',
            borderRadius: 8, padding: '7px 13px',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}