/**
 * hooks/useDeviceAuth.ts
 * Gère le cycle d'autorisation du terminal (S-11) :
 * - Stocke le device_pass exclusivement via le cookie sécurisé inter-domaines scout_device_pass
 * - Expose verify() pour vérifier la validité auprès de l'API FastAPI
 * - Gère le blackout, les états de chargement, etc.
 */
import { useState, useCallback, useEffect } from 'react'
import type { AuthState } from '../types'
import { apiVerify } from '../services/api'
import { clearDevicePassCookie } from '../services/cookies'

// Fonction de sauvegarde exclusive via cookie sécurisé :
export function saveDevicePass(pass: string): void {
  if (typeof document === 'undefined') return
  const isScout = typeof window !== 'undefined' && window.location.hostname.endsWith('scoutgame.ch')
  if (isScout) {
    document.cookie = `scout_device_pass=${encodeURIComponent(pass)}; Domain=.scoutgame.ch; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
  } else {
    document.cookie = `scout_device_pass=${encodeURIComponent(pass)}; Path=/; Max-Age=31536000; SameSite=Lax`
  }
}

// Fonction de lecture exclusive depuis le cookie :
export function getDevicePass(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )scout_device_pass=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

export function useDeviceAuth() {
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [blackoutMessage, setBlackoutMessage] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Nettoyage proactif de tout résidu éventuel dans localStorage & vérification au montage
  useEffect(() => {
    try {
      localStorage.removeItem('scout_device_pass')
    } catch {
      // ignore
    }

    const pass = getDevicePass()
    if (!pass) {
      setAuthState('unauthorized')
    }
  }, [])

  const devicePass = useCallback((): string | null => {
    return getDevicePass()
  }, [])

  const savePass = useCallback((pass: string) => {
    saveDevicePass(pass)
  }, [])

  const verify = useCallback(async (): Promise<AuthState> => {
    const pass = getDevicePass()
    if (!pass) {
      setAuthState('unauthorized')
      return 'unauthorized'
    }

    setIsVerifying(true)
    try {
      const res = await apiVerify(pass)
      if (res.blackout) {
        setBlackoutMessage(res.reason ?? '')
        setAuthState('blackout')
        return 'blackout'
      }
      if (res.valid) {
        setAuthState('authorized')
        return 'authorized'
      }
      setAuthState('unauthorized')
      return 'unauthorized'
    } catch (err) {
      // S'il s'agit d'une coupure réseau ou d'un timeout, conserver l'état actuel pour permettre le jeu hors-ligne
      console.warn('[auth] Défaillance réseau temporaire lors de la vérification, maintien de l’état local :', err)
      return authState
    } finally {
      setIsVerifying(false)
    }
  }, [authState])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('scout_device_pass')
    } catch {
      // ignore
    }
    clearDevicePassCookie()
    setAuthState('unauthorized')
  }, [])

  return {
    authState,
    setAuthState,
    blackoutMessage,
    isVerifying,
    devicePass,
    saveDevicePass: savePass,
    verify,
    logout,
  }
}

