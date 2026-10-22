import { useState, useEffect } from 'react'

// Loads the Google Maps JS API (Places library) once and reports when it is ready.
export function useGoogleMaps(enabled = true) {
  const [, setTick] = useState(0)
  const ready = () => typeof window !== 'undefined' && !!window.google?.maps?.places

  useEffect(() => {
    if (!enabled || ready()) return
    const onLoad = () => setTick(t => t + 1)
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) { existing.addEventListener('load', onLoad); return () => existing.removeEventListener('load', onLoad) }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.dataset.gmaps = 'true'
    script.onload = onLoad
    document.head.appendChild(script)
  }, [enabled])

  return ready()
}
