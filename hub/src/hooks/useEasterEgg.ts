/**
 * hooks/useEasterEgg.ts
 * Section 7.4 — Déclenchement discret de l'Easter Egg :
 * 5 clics/taps rapides consécutifs sur la mention de copyright du footer.
 * Vibration haptique (navigator.vibrate) lors du déclenchement.
 */
import { useRef, useCallback } from 'react'

const REQUIRED_TAPS = 5
const TAP_TIMEOUT_MS = 800

export function useEasterEgg(onTrigger: () => void) {
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onFooterTap = useCallback(() => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)

    if (tapCount.current >= REQUIRED_TAPS) {
      tapCount.current = 0
      try {
        navigator.vibrate?.(50)
      } catch {
        // Ignorer si vibration indisponible
      }
      onTrigger()
      return
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0
    }, TAP_TIMEOUT_MS)
  }, [onTrigger])

  const footerProps = {
    onClick: onFooterTap,
    style: { cursor: 'default', userSelect: 'none' as const },
    'aria-hidden': true,
  }

  return { footerProps }
}
