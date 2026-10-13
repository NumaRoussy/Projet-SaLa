/**
 * hooks/useDeviceAuth.ts
 * Gère le cycle d'autorisation du terminal :
 * - Récupère le device_pass depuis localStorage
 * - Expose verify() pour vérifier la validité auprès de l'API
 * - Gère le blackout, les états de chargement, etc.
 */
import { useState, useCallback } from 'react'
import type { AuthState } from '../types'
import { apiVerify } from '../services/api'

const STORAGE_KEY = 'scout_device_pass'

export function useDeviceAuth() {
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [blackoutMessage, setBlackoutMessage] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)

  const devicePass = (): string | null => localStorage.getItem(STORAGE_KEY)

  const saveDevicePass = useCallback((pass: string) => {
    localStorage.setItem(STORAGE_KEY, pass)
  }, [])

  const verify = useCallback(async (): Promise<AuthState> => {
    const pass = devicePass()
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
    } catch {
      // En cas d'erreur réseau, on ne bloque pas l'accès —
      // on traite comme non-autorisé silencieusement
      setAuthState('unauthorized')
      return 'unauthorized'
    } finally {
      setIsVerifying(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuthState('unauthorized')
  }, [])

  return {
    authState,
    setAuthState,
    blackoutMessage,
    isVerifying,
    devicePass,
    saveDevicePass,
    verify,
    logout,
  }
}
