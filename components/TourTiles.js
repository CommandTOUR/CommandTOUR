'use client'

const TOURS = [
  {
    id: 1,
    name: 'Hot Wheels Stunt Show',
    region: 'North America · 2026',
    color: '#C9A84C',
    status: 'active',
    total: 18,
    completed: 11,
    director: 'M. Reyes',
    directorInitials: 'MR',
    nextEvent: 'Chicago · May 27',
  },
  {
    id: 2,
    name: 'Monster Trucks World Tour',
    region: 'Europe · 2026',
    color: '#33FF99',
    status: 'active',
    total: 24,
    completed: 4,
    director: 'T. Nakamura',
    directorInitials: 'TN',
    nextEvent: 'London · May 28',
  },
  {
    id: 3,
    name: 'HWSS Asia Pacific',
    region: 'Asia Pacific · 2026',
    color: '#FFCC00',
    status: 'upcoming',
    total: 14,
    completed: 0,
    director: 'S. Lee',
    directorInitials: 'SL',
    nextEvent: 'Sydney · Aug 3',
  },
]

export default function TourTiles() {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Active Tours
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}>
          All Tours →
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}>
        {TOURS.map(tour => {
          const pct = Math.round((tour.completed / tour.total) * 100)
          const remaining = tour.total - tour.completed
          const isUpcoming = tour.status === 'upcoming'

          return (
            <div key={tour.id} className="glass-card" style={{
              padding: '18px 19px',
              cursor: 'pointer',
              opacity: isUpcoming ? 0.75 : 1,
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 0.15s, border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
            >
              {/* Color bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: tour.color, borderRadius: '14px 14px 0 0',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{tour.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{tour.region}</div>
                </div>
                <span className={`badge badge-${tour.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                  {tour.status === 'active' ? 'Active' : 'Upcoming'}
                </span>
              </div>

              {/* Counts */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {[
                  { val: tour.total, lbl: 'Total' },
                  { val: tour.completed, lbl: 'Done', color: 'var(--mint)' },
                  { val: remaining, lbl: 'Left' },
                ].map(item => (
                  <div key={item.lbl}>
                    <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{item.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 0.5, background: 'var(--glass-border)', marginBottom: 14 }} />

              {/* Progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: tour.color, borderRadius: 2 }} />
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: `${tour.color}22`,
                    border: `0.5px solid ${tour.color}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, color: tour.color, flexShrink: 0,
                  }}>
                    {tour.directorInitials}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tour.director}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
                  {tour.nextEvent}
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}