/**
 * hooks/useEasterEgg.ts
 * Déclenchement discret de l'Easter Egg :
 * Triple-tap rapide consécutif sur la mention de copyright du footer.
 * Vibration haptique (navigator.vibrate) lors du déclenchement.
 * Ne bloque JAMAIS le défilement (aucun preventDefault global).
 */
import { useRef, useCallback, useEffect } from 'react'

const REQUIRED_TAPS = 3
const TAP_TIMEOUT_MS = 750

export function useEasterEgg(onTrigger: () => void) {
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(() => {
    try {
      navigator.vibrate?.(50)
    } catch {
      // Ignorer si vibration indisponible
    }
    onTrigger()
  }, [onTrigger])

  // ── Triple-tap footer ──────────────────────────────────────────────────────
  const onFooterTap = useCallback(() => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)

    if (tapCount.current >= REQUIRED_TAPS) {
      tapCount.current = 0
      trigger()
      return
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0
    }, TAP_TIMEOUT_MS)
  }, [trigger])

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [])

  const footerProps = {
    onClick: onFooterTap,
    style: {
      cursor: 'default',
      userSelect: 'none' as const,
      touchAction: 'manipulation' as const,
    },
    'aria-hidden': true,
  }

  return { footerProps }
}

