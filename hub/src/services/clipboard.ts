/**
 * services/clipboard.ts
 * Copie un texte dans le presse-papier avec fallback pour HTTP sur IP locale.
 * Sur une IP locale en HTTP (ex: http://192.168.x.x:5173), navigator.clipboard.writeText
 * est bloqué par les navigateurs car hors Secure Context. Ce fallback utilise
 * textarea + document.execCommand('copy').
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Essai via l'API moderne navigator.clipboard (nécessite Secure Context / HTTPS ou localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback
    }
  }

  // 2. Fallback universel pour HTTP sur IP Wi-Fi
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    textArea.setAttribute('readonly', '')
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, 99999)
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch {
    return false
  }
}
