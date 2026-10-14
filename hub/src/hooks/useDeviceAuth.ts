/**
 * hooks/useDeviceAuth.ts
 * Gère le cycle d'autorisation du terminal :
 * - Stocke le device_pass dans localStorage ET dans le cookie partagé scout_device_pass
 * - Expose verify() pour vérifier la validité auprès de l'API FastAPI
 * - Gère le blackout, les états de chargement, etc.
 */
import { useState, useCallback } from 'react'
import type { AuthState } from '../types'
import { apiVerify } from '../services/api'
import {
  saveDevicePassCookie,
  loadDevicePassCookie,
  clearDevicePassCookie,
} from '../services/cookies'

const STORAGE_KEY = 'scout_device_pass'

export function useDeviceAuth() {
  const [authState, setAuthState] = useState<AuthState>('unknown')
  const [blackoutMessage, setBlackoutMessage] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)

  const devicePass = useCallback((): string | null => {
    return localStorage.getItem(STORAGE_KEY) || loadDevicePassCookie()
  }, [])

  const saveDevicePass = useCallback((pass: string) => {
    localStorage.setItem(STORAGE_KEY, pass)
    saveDevicePassCookie(pass)
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
  }, [devicePass])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    clearDevicePassCookie()
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
