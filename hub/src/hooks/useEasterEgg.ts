/**
 * hooks/useEasterEgg.ts
 * Section 7.4 — Déclenchement discret de l'Easter Egg :
 * 1. Triple-tap rapide consécutif sur la mention de copyright du footer.
 * 2. Appui long de 3 secondes sur le logo de la Face A.
 * Vibration haptique (navigator.vibrate) lors du déclenchement.
 * Ne bloque JAMAIS le défilement (aucun preventDefault global).
 */
import { useRef, useState, useCallback, useEffect } from 'react'

const REQUIRED_TAPS = 3
const TAP_TIMEOUT_MS = 600
const LONG_PRESS_MS = 3000

export function useEasterEgg(onTrigger: () => void) {
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isPressingLogo, setIsPressingLogo] = useState(false)

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

  // ── Appui long 3s sur le logo ──────────────────────────────────────────────
  const startLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    setIsPressingLogo(true)

    longPressTimer.current = setTimeout(() => {
      setIsPressingLogo(false)
      trigger()
    }, LONG_PRESS_MS)
  }, [trigger])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsPressingLogo(false)
  }, [])

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current)
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  const footerProps = {
    onClick: onFooterTap,
    style: { cursor: 'default', userSelect: 'none' as const },
    'aria-hidden': true,
  }

  // Événements tactiles & souris non intrusifs (n'appellent JAMAIS e.preventDefault())
  const logoProps = {
    onMouseDown: startLongPress,
    onMouseUp: cancelLongPress,
    onMouseLeave: cancelLongPress,
    onTouchStart: startLongPress,
    onTouchEnd: cancelLongPress,
    onTouchCancel: cancelLongPress,
    onTouchMove: cancelLongPress, // Si l'utilisateur commence à scroller avec son doigt sur le logo, annuler sans bloquer le scroll !
  }

  return { footerProps, logoProps, isPressingLogo }
}
