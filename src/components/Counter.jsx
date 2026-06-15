import { useEffect, useRef, useState } from 'react'

export default function Counter({ value, decimals = 0, duration = 700 }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = Number(value) || 0
    const start = performance.now()

    let frame
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span>{display.toFixed(decimals)}</span>
}
