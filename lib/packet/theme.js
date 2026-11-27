// Tokens and DM Sans registration for the Event Packet PDFs.
import path from 'node:path'
import { Font } from '@react-pdf/renderer'

export const C = {
  text: '#14213a', muted: '#4a5873', border: '#cfd5df', divider: '#e6eaf1',
  blue: '#0b5fd6', green: '#15803d', amber: '#b45309', soft: '#f4f6fa',
}
export const FONT = 'DM Sans'
export const PAGE_MARGIN = 28.8 // 0.4in

// Blend a hex color into white. Used for tints: the neon tour color is never used behind text directly.
export function tint(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  const n = m ? parseInt(m[1], 16) : 0x8a94a6
  const mix = (c) => Math.round(255 - (255 - c) * alpha)
  const h = (v) => v.toString(16).padStart(2, '0')
  return `#${h(mix(n >> 16))}${h(mix((n >> 8) & 255))}${h(mix(n & 255))}`
}
export const tourColor = (hex) => (/^#?[0-9a-f]{6}$/i.test(hex || '') ? (hex.startsWith('#') ? hex : `#${hex}`) : '#8a94a6')

let registered = false
export function registerFonts() {
  if (registered) return
  const dir = path.join(process.cwd(), 'node_modules', '@fontsource', 'dm-sans', 'files')
  // react-pdf reads .woff (not .woff2)
  Font.register({
    family: FONT,
    fonts: [400, 500, 600, 700].map(w => ({ src: path.join(dir, `dm-sans-latin-${w}-normal.woff`), fontWeight: w })),
  })
  // Break very long unbroken strings (emails, long notes) instead of letting them run past the margin
  Font.registerHyphenationCallback(word => (word.length > 18 ? word.match(/.{1,14}/g) : [word]))
  registered = true
}
