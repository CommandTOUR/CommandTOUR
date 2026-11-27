'use client'

// Position a dropdown menu next to an anchor element, in a portal on document.body (so no parent can clip it or stack over it).
// It opens below the anchor; if it would run off the bottom it opens upward, and if it would run off the right it aligns to the anchor's right edge.
import { useLayoutEffect, useState } from 'react'

const EDGE = 8

export function placeMenu(rect, width, desiredHeight, gap = 4) {
  const vw = window.innerWidth, vh = window.innerHeight
  let left = rect.left
  if (left + width > vw - EDGE) left = rect.right - width       // flip left: align right edges
  left = Math.max(EDGE, Math.min(left, vw - width - EDGE))      // and never leave the viewport
  const roomBelow = vh - rect.bottom - gap - EDGE
  const roomAbove = rect.top - gap - EDGE
  if (desiredHeight <= roomBelow || roomBelow >= roomAbove) return { position: 'fixed', left, top: rect.bottom + gap, width, maxHeight: Math.max(80, Math.min(desiredHeight, roomBelow)) }
  return { position: 'fixed', left, bottom: vh - rect.top + gap, width, maxHeight: Math.max(80, Math.min(desiredHeight, roomAbove)) }
}

// Returns the fixed-position style for the menu (null until measured), re-measured on scroll and resize while open.
export function useAnchoredMenu(anchorRef, open, width, desiredHeight) {
  const [style, setStyle] = useState(null)
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => { if (anchorRef.current) setStyle(placeMenu(anchorRef.current.getBoundingClientRect(), width, desiredHeight)) }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true) // capture: the grid scrolls in its own container
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open, width, desiredHeight, anchorRef])
  return open ? style : null
}
