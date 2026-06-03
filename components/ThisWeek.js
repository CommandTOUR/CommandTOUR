'use client'

const WEEK_EVENTS = [
  {
    id: 1,
    tourColor: '#C9A84C',
    city: 'Chicago',
    tour: 'Tour A',
    dates: 'May 26 – May 28',
    shows: '2 shows',
    type: 'loadin',
    typeLabel: 'Load-In',
  },
  {
    id: 2,
    tourColor: '#33FF99',
    city: 'London',
    tour: 'Tour B',
    dates: 'May 28 – May 31',
    shows: '3 shows',
    type: 'show',
    typeLabel: 'Show',
  },
  {
    id: 3,
    tourColor: '#FFCC00',
    city: 'Sydney',
    tour: 'Tour C',
    dates: 'Jun 1 – Jun 3',
    shows: '1 show',
    type: 'travel',
    typeLabel: 'Travel',
  },
]

const TYPE_STYLES = {
  show: { background: 'rgba(51,255,153,0.1)', color: '#33FF99' },
  loadin: { background: 'rgba(255,204,0,0.1)', color: '#FFCC00' },
  travel: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' },
}

export default function ThisWeek() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          This Week
        </div>
        <div style={{ fontSize: 14, color: 'var(--mint)', cursor: 'pointer' }}>
          Calendar →
        </div>
      </div>

      {WEEK_EVENTS.map(ev => (
        <div key={ev.id}
          className="glass-card"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
        >
          {/* Tour color dot */}
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.tourColor, flexShrink: 0, marginTop: 5 }} />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{ev.city}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>{ev.tour}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{ev.dates}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{ev.shows}</div>
          </div>

          {/* Status pill */}
          <div style={{
            fontSize: 12, fontWeight: 500,
            padding: '4px 11px', borderRadius: 20,
            flexShrink: 0,
            ...TYPE_STYLES[ev.type],
          }}>
            {ev.typeLabel}
          </div>
        </div>
      ))}
    </div>
  )
}