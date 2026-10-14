import jsQR from 'jsqr'

export async function decodeQRFromImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sourceBitmap?: ImageBitmapSource,
): Promise<string | null> {
  // 1. BarcodeDetector if available (Chromium, Android)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window && sourceBitmap) {
    try {
      // @ts-expect-error BarcodeDetector
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      const results = await detector.detect(sourceBitmap)
      if (results && results.length > 0 && results[0].rawValue) {
        return results[0].rawValue.trim()
      }
    } catch {
      // fallback to jsQR
    }
  }

  // 2. jsQR universal decoder (iOS Safari, Firefox, Chrome)
  try {
    const imgData = ctx.getImageData(0, 0, width, height)
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (code && code.data) {
      return code.data.trim()
    }
  } catch {
    // ignore decoding errors
  }

  return null
}

export async function decodeQRFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null
  }

  const canvas = document.createElement('canvas')
  const maxDim = 640
  let w = video.videoWidth
  let h = video.videoHeight
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w)
      w = maxDim
    } else {
      w = Math.round((w * maxDim) / h)
      h = maxDim
    }
  }
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, w, h)
  return decodeQRFromImageData(ctx, w, h, video)
}

export async function decodeQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const maxDim = 1200
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const result = await decodeQRFromImageData(ctx, w, h, img)
        resolve(result)
      }
      img.onerror = () => resolve(null)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}
