import { useState, useRef, useEffect, useCallback } from 'react'
import { decodeQRFromVideo, decodeQRFromFile } from '../services/qrDecoder'

interface Props {
  onScan: (decodedText: string) => void
  onClose?: () => void
  title?: string
  subtitle?: string
  accentColor?: 'amber' | 'emerald' | 'red'
  autoStart?: boolean
}

export function CameraQRScanner({
  onScan,
  onClose,
  title = 'Scanner un QR code',
  subtitle = 'Placez le QR code au centre du cadre pour le scanner',
  accentColor = 'amber',
  autoStart = true,
}: Props) {
  const [streamActive, setStreamActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false)
  const [isSupportedMedia, setIsSupportedMedia] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopCameraStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStreamActive(false)
  }, [])

  const startLiveCamera = useCallback(async () => {
    setErrorMessage(null)
    stopCameraStream()

    // Vérifier la présence de mediaDevices (souvent bloqué en HTTP sur IP non localhost)
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setIsSupportedMedia(false)
      setErrorMessage(
        'Le flux vidéo direct nécessite un contexte sécurisé (HTTPS). Sur une IP locale Wi-Fi en HTTP, utilisez le bouton ci-dessous pour capturer directement une photo avec votre appareil photo.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      setStreamActive(true)

      // Attendre le montage du composant vidéo
      setTimeout(async () => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // L'autoplay inline est généralement permis
        }

        // Boucle de scan continue
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const result = await decodeQRFromVideo(videoRef.current)
            if (result && result.trim().length > 0) {
              stopCameraStream()
              onScan(result.trim())
            }
          } catch {
            // Ignorer les erreurs d'analyse de frame
          }
        }, 250)
      }, 150)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setStreamActive(false)
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setErrorMessage(
          'Accès caméra refusé par le navigateur. Vous pouvez autoriser la caméra dans les réglages du navigateur ou prendre une photo avec le bouton ci-dessous.',
        )
      } else {
        setErrorMessage(
          'Impossible de démarrer le flux vidéo direct. Utilisez le bouton ci-dessous pour prendre une photo du QR code avec votre appareil photo.',
        )
      }
    }
  }, [stopCameraStream, onScan])

  useEffect(() => {
    if (autoStart) {
      startLiveCamera()
    }
    return () => {
      stopCameraStream()
    }
  }, [autoStart, startLiveCamera, stopCameraStream])

  // Décodage depuis la capture photo (input file)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzingPhoto(true)
    setErrorMessage(null)

    try {
      const result = await decodeQRFromFile(file)
      if (result && result.trim().length > 0) {
        stopCameraStream()
        onScan(result.trim())
      } else {
        setErrorMessage(
          'Aucun QR code lisible n’a été détecté sur cette photo. Rapprochez-vous bien du code avec un éclairage suffisant et réessayez.',
        )
      }
    } catch {
      setErrorMessage(
        'Erreur lors du traitement de l’image. Veuillez réessayer ou saisir le code manuellement.',
      )
    } finally {
      setIsAnalyzingPhoto(false)
      // Réinitialiser la valeur pour permettre de reprendre la même photo si besoin
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const borderColor =
    accentColor === 'red'
      ? 'border-red-500/60'
      : accentColor === 'emerald'
      ? 'border-emerald-500/60'
      : 'border-scout-amber/60'

  const focusBorderColor =
    accentColor === 'red'
      ? 'border-red-400'
      : accentColor === 'emerald'
      ? 'border-emerald-400'
      : 'border-scout-amber'

  return (
    <div className="space-y-3 w-full">
      {/* Input file caché pour capture photo de secours (fonctionne partout en HTTP Wi-Fi) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Cadre de visée de la caméra */}
      <div
        className={`relative w-full aspect-square max-w-[280px] sm:max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black/90 border-2 ${borderColor} flex items-center justify-center`}
      >
        {streamActive ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            {/* Viseur animé */}
            <div
              className={`absolute inset-8 border-2 ${focusBorderColor} rounded-xl pointer-events-none transition-colors duration-300`}
            >
              {/* Coins de cadrage */}
              <div
                className={`absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 ${focusBorderColor}`}
              />
              <div
                className={`absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 ${focusBorderColor}`}
              />
              <div
                className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 ${focusBorderColor}`}
              />
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 ${focusBorderColor}`}
              />
              {/* Ligne laser de balayage */}
              <div className="w-full h-0.5 bg-amber-400 absolute top-1/2 -translate-y-1/2" />
            </div>
          </>
        ) : (
          <div className="p-4 text-center space-y-3 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-[#162920] border border-[#2d6a4f] flex items-center justify-center text-3xl">
              📷
            </div>
            <p className="text-xs text-gray-300 font-medium px-2">
              {isAnalyzingPhoto
                ? '🔍 Analyse de la photo en cours…'
                : 'Appareil photo prêt pour scan'}
            </p>
            {isSupportedMedia && (
              <button
                type="button"
                onClick={startLiveCamera}
                className="btn-ghost py-1 px-3 text-xs border border-[#2d6a4f] text-scout-amber"
              >
                🔄 Relancer le flux direct
              </button>
            )}
          </div>
        )}

        {/* Overlay d'analyse de photo */}
        {isAnalyzingPhoto && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 p-4 text-center z-20">
            <div className="w-8 h-8 border-2 border-scout-amber border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-white">
              Décodage du QR code…
            </span>
          </div>
        )}
      </div>

      {/* Titres & Instructions */}
      <div className="text-center space-y-1">
        {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
        {subtitle && (
          <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Message d'erreur / Info HTTP si flux bloqué */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 leading-relaxed text-left">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <span>ℹ️</span>
            <span>Accès Caméra & Wi-Fi local</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-normal">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Bouton d'action principal : Toujours disponible (y compris en fallback HTTP) */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>
            {streamActive
              ? 'Prendre une photo si le scan hésite'
              : "Prendre en photo le QR code (Appareil photo)"}
          </span>
        </button>

        {streamActive && (
          <button
            type="button"
            onClick={stopCameraStream}
            className="btn-ghost w-full py-1 text-xs text-gray-400 hover:text-white"
          >
            Suspendre la caméra
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={() => {
              stopCameraStream()
              onClose()
            }}
            className="btn-ghost w-full py-1.5 text-xs text-gray-400 hover:text-white"
          >
            Fermer le scanner
          </button>
        )}
      </div>
    </div>
  )
}
