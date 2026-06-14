'use client'

export default function FilesTab() {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Event Files</div>
        <button
          disabled
          title="Coming soon"
          className="btn-primary"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          + Upload File
        </button>
      </div>
      <div className="glass-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 12 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>No files uploaded yet</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>File uploads coming in a future update</div>
      </div>
    </div>
  )
}
