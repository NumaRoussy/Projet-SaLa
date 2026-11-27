/**
 * components/FaceB/DeviceQR.tsx
 * QR code d'identification de l'appareil courant.
 */
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  devicePass: string
}

export function DeviceQR({ devicePass }: Props) {
  const qrValue = devicePass

  return (
    <div className="bg-[#1f2229] border border-[#2e323c] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-display font-bold text-[#f3f4f6]">Mon appareil</h3>
        <p className="text-xs text-slate-400">ID unique de cette session</p>
      </div>

      <div className="flex justify-center p-4 bg-[#f3f4f6] rounded-2xl border border-[#2e323c]">
        <QRCodeSVG
          value={qrValue}
          size={160}
          bgColor="#f3f4f6"
          fgColor="#111827"
          level="L"
        />
      </div>

      <div className="p-3 rounded-xl bg-[#16181d] border border-[#2e323c]">
        <p className="text-xs text-slate-400 mb-1">Device ID</p>
        <code className="text-xs text-[#e5be6d] break-all font-mono">
          {devicePass}
        </code>
      </div>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        Ce QR code est utilisé par un responsable témoin pour vous signaler si nécessaire.
      </p>
    </div>
  )
}
