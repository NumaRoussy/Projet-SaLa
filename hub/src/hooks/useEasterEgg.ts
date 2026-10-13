/**
 * hooks/useEasterEgg.ts
 * Section 7.4 — Déclenchement de l'Easter Egg :
 *   1. Appui long de 3 secondes sur le logo principal
 *   2. Triple-tap sur le copyright du footer
 *
 * Retourne les props à attacher aux éléments cibles.
 */
import { useRef, useCallback } from 'react'

export function useEasterEgg(onTrigger: () => void) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPressing = useRef(false)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Long press (3 s) ─────────────────────────────────────────────────────
  const onPressStart = useCallback(() => {
    isPressing.current = true
    pressTimer.current = setTimeout(() => {
      if (isPressing.current) {
        navigator.vibrate?.(50)
        onTrigger()
      }
    }, 3000)
  }, [onTrigger])

  const onPressEnd = useCallback(() => {
    isPressing.current = false
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  const logoProps = {
    onMouseDown: onPressStart,
    onMouseUp: onPressEnd,
    onMouseLeave: onPressEnd,
    onTouchStart: onPressStart,
    onTouchEnd: onPressEnd,
    onTouchCancel: onPressEnd,
    style: { cursor: 'pointer', userSelect: 'none' as const },
  }

  // ── Triple-tap (footer copyright) ─────────────────────────────────────────
  const onFooterTap = useCallback(() => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)

    if (tapCount.current >= 3) {
      tapCount.current = 0
      navigator.vibrate?.(50)
      onTrigger()
      return
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0
    }, 600)
  }, [onTrigger])

  const footerProps = {
    onClick: onFooterTap,
    style: { cursor: 'default', userSelect: 'none' as const },
  }

  return { logoProps, footerProps }
}
