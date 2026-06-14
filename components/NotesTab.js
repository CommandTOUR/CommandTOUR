'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const toolbarBtnStyle = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, width: 32, height: 32, borderRadius: 6,
  border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default function NotesTab({ eventId }) {
  const [content, setContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const textareaRef = useRef(null)
  const saveTimeout = useRef(null)

  useEffect(() => {
    const fetchNote = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('event_notes').select('*').eq('event_id', eventId).maybeSingle()
      if (data) {
        setContent(data.content || '')
        setUpdatedAt(data.updated_at)
      }
      setLoading(false)
    }
    fetchNote()
  }, [eventId])

  const saveNote = async (value) => {
    const supabase = getSupabase()
    const now = new Date().toISOString()
    const { data } = await supabase.from('event_notes').upsert({ event_id: eventId, content: value, updated_at: now }, { onConflict: 'event_id' }).select().single()
    setUpdatedAt(data?.updated_at || now)
  }

  const queueSave = (value) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveNote(value), 500)
  }

  const handleChange = (e) => {
    const value = e.target.value
    setContent(value)
    queueSave(value)
  }

  const handleBlur = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveNote(content)
  }

  const applyFormat = (type) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd, value } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    let newText, newStart, newEnd

    if (type === 'bold') {
      const text = selected || 'bold text'
      newText = value.slice(0, selectionStart) + `**${text}**` + value.slice(selectionEnd)
      newStart = selectionStart + 2
      newEnd = newStart + text.length
    } else if (type === 'italic') {
      const text = selected || 'italic text'
      newText = value.slice(0, selectionStart) + `*${text}*` + value.slice(selectionEnd)
      newStart = selectionStart + 1
      newEnd = newStart + text.length
    } else if (type === 'underline') {
      const text = selected || 'underlined text'
      newText = value.slice(0, selectionStart) + `<u>${text}</u>` + value.slice(selectionEnd)
      newStart = selectionStart + 3
      newEnd = newStart + text.length
    } else if (type === 'bullet') {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
      let lineEnd = value.indexOf('\n', selectionEnd)
      if (lineEnd === -1) lineEnd = value.length
      const block = value.slice(lineStart, lineEnd)
      const newBlock = block.split('\n').map(line => line.startsWith('- ') ? line : `- ${line}`).join('\n')
      newText = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
      newStart = selectionStart + 2
      newEnd = newStart + (selectionEnd - selectionStart)
    }

    setContent(newText)
    queueSave(newText)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(newStart, newEnd)
    })
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading notes...</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Notes</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('bold')} title="Bold"><b>B</b></button>
        <button type="button" style={{ ...toolbarBtnStyle, fontStyle: 'italic' }} onClick={() => applyFormat('italic')} title="Italic">I</button>
        <button type="button" style={{ ...toolbarBtnStyle, textDecoration: 'underline' }} onClick={() => applyFormat('underline')} title="Underline">U</button>
        <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('bullet')} title="Bullet list">•</button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add notes about this event..."
        style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '14px 16px', borderRadius: 10,
          border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
          outline: 'none', width: '100%', minHeight: 320, resize: 'vertical', lineHeight: 1.6,
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
