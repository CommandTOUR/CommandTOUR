'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const TOOLBAR_BTN = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, minWidth: 32, height: 32, padding: '0 8px', borderRadius: 6,
  border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const SELECT_STYLE = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '6px 10px', borderRadius: 6,
  border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
  outline: 'none', cursor: 'pointer',
}

const COLOR_SWATCHES = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Mint', value: '#33FF99' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Red', value: '#FF3333' },
  { name: 'Muted', value: '#888888' },
]

const FONT_SIZE_OPTIONS = [
  { label: 'Small', px: '12' },
  { label: 'Normal', px: '14' },
  { label: 'Large', px: '18' },
  { label: 'XL', px: '24' },
]

const FONT_SIZE_MAP = { '12': '2', '14': '3', '18': '5', '24': '7' }

function AlignIcon({ align }) {
  const widths = align === 'justify' ? ['100%', '100%', '100%'] : ['100%', '65%', '85%']
  const itemsAlign = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'stretch'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 16 }}>
      {widths.map((w, i) => (
        <div key={i} style={{ height: 2, width: w, background: 'currentColor', borderRadius: 1, alignSelf: itemsAlign }} />
      ))}
    </div>
  )
}

export default function NotesTab({ eventId }) {
  const [loading, setLoading] = useState(true)
  const [initialContent, setInitialContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const editorRef = useRef(null)
  const saveTimeout = useRef(null)

  useEffect(() => {
    const fetchNote = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('event_notes').select('*').eq('event_id', eventId).maybeSingle()
      setInitialContent(data?.content || '')
      setUpdatedAt(data?.updated_at || null)
      setLoading(false)
    }
    fetchNote()
  }, [eventId])

  useEffect(() => {
    if (!loading && editorRef.current) editorRef.current.innerHTML = initialContent
  }, [loading, initialContent])

  const saveNote = async () => {
    const supabase = getSupabase()
    const content = editorRef.current?.innerHTML || ''
    const now = new Date().toISOString()
    const { data } = await supabase.from('event_notes').upsert({ event_id: eventId, content, updated_at: now }, { onConflict: 'event_id' }).select().single()
    setUpdatedAt(data?.updated_at || now)
  }

  const queueSave = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(saveNote, 500)
  }

  const handleBlur = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveNote()
  }

  const exec = (command, value = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    queueSave()
  }

  const applyFontSize = (px) => {
    editorRef.current?.focus()
    document.execCommand('fontSize', false, FONT_SIZE_MAP[px])
    const editor = editorRef.current
    if (editor) {
      editor.querySelectorAll(`font[size="${FONT_SIZE_MAP[px]}"]`).forEach(font => {
        font.removeAttribute('size')
        font.style.fontSize = `${px}px`
      })
    }
    queueSave()
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading notes...</div>

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Notes</div>

      <div className="glass-card" style={{ padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Row 1: text style */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('bold')} title="Bold"><b>B</b></button>
          <button type="button" style={{ ...TOOLBAR_BTN, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Italic">I</button>
          <button type="button" style={{ ...TOOLBAR_BTN, textDecoration: 'underline' }} onClick={() => exec('underline')} title="Underline">U</button>
          <button type="button" style={{ ...TOOLBAR_BTN, textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')} title="Strikethrough">S</button>
        </div>

        {/* Row 2: alignment */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('justifyLeft')} title="Align left"><AlignIcon align="left" /></button>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('justifyCenter')} title="Align center"><AlignIcon align="center" /></button>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('justifyRight')} title="Align right"><AlignIcon align="right" /></button>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('justifyFull')} title="Justify"><AlignIcon align="justify" /></button>
        </div>

        {/* Row 3: lists */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('insertUnorderedList')} title="Bullet list">• ≡</button>
          <button type="button" style={TOOLBAR_BTN} onClick={() => exec('insertOrderedList')} title="Numbered list">1. ≡</button>
        </div>

        {/* Row 4: font size */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Size</span>
          <select style={SELECT_STYLE} defaultValue="14" onChange={e => applyFontSize(e.target.value)}>
            {FONT_SIZE_OPTIONS.map(opt => (
              <option key={opt.px} value={opt.px}>{opt.label} ({opt.px}px)</option>
            ))}
          </select>
        </div>

        {/* Row 5: text color */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Color</span>
          {COLOR_SWATCHES.map(c => (
            <div
              key={c.value}
              onClick={() => exec('foreColor', c.value)}
              title={c.name}
              style={{ width: 22, height: 22, borderRadius: '50%', background: c.value, border: '1px solid var(--glass-border)', cursor: 'pointer' }}
            />
          ))}
          <input
            type="color"
            onChange={e => exec('foreColor', e.target.value)}
            title="Custom color"
            style={{ width: 28, height: 28, padding: 0, border: '0.5px solid var(--glass-border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div
        ref={editorRef}
        className="notes-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={queueSave}
        onBlur={handleBlur}
        data-placeholder="Add notes about this event..."
        style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '14px 16px', borderRadius: 10,
          border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
          outline: 'none', width: '100%', minHeight: 400, lineHeight: 1.6,
        }}
      />

      {updatedAt && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Last updated {new Date(updatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}
    </div>
  )
}
