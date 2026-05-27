'use client'

const WEEK_EVENTS = [
  {
    id: 1,
    dateNum: '26',
    dateDay: 'Mon',
    tourColor: '#C9A84C',
    name: 'Chicago — United Center',
    sub: 'HWSS · Load-In · 06:00',
    type: 'loadin',
    typeLabel: 'Load-In',
  },
  {
    id: 2,
    dateNum: '27',
    dateDay: 'Tue',
    tourColor: '#C9A84C',
    name: 'Chicago — United Center',
    sub: 'HWSS · Show Day · 2 shows',
    type: 'show',
    typeLabel: 'Show',
  },
  {
    id: 3,
    dateNum: '28',
    dateDay: 'Wed',
    tourColor: '#33FF99',
    name: 'London — The O2',
    sub: 'Trucks · Travel Day',
    type: 'travel',
    typeLabel: 'Travel',
  },
  {
    id: 4,
    dateNum: '30',
    dateDay: 'Fri',
    tourColor: '#33FF99',
    name: 'London — The O2',
    sub: 'Trucks · Show Day · 3 shows',
    type: 'show',
    typeLabel: 'Show',
  },
  {
    id: 5,
    dateNum: '31',
    dateDay: 'Sat',
    tourColor: '#33FF99',
    name: 'London — The O2',
    sub: 'Trucks · Show Day · 2 shows',
    type: 'show',
    typeLabel: 'Show',
  },
]

const TYPE_STYLES = {
  show: { background: 'rgba(51,255,153,0.1)', color: '#33FF99' },
  loadin: { background: 'rgba(255,204,0,0.1)', color: '#FFCC00' },
  travel: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' },
}

export default function ThisWeek() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 6,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          This Week
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}>
          Calendar →
        </div>
      </div>

      {WEEK_EVENTS.map(ev => (
        <div key={ev.id}
          className="glass-card"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 13px', borderRadius: 8, cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
        >
          {/* Date */}
          <div style={{ textAlign: 'center', minWidth: 36, flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{ev.dateNum}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ev.dateDay}</div>
          </div>

          {/* Separator */}
          <div style={{ width: 0.5, height: 30, background: 'var(--glass-border)', flexShrink: 0 }} />

          {/* Tour dot */}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.tourColor, flexShrink: 0 }} />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ev.sub}</div>
          </div>

          {/* Badge */}
          <div style={{
            fontSize: 11, fontWeight: 500,
            padding: '3px 9px', borderRadius: 20,
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