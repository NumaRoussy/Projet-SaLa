/**
 * components/FaceB/DeviceQR.tsx
 * QR code d'identification de l'appareil courant (section 7.4).
 * Contient le device_pass pour qu'un responsable témoin puisse le scanner
 * lors d'un signalement de terrain.
 */
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  devicePass: string
}

export function DeviceQR({ devicePass }: Props) {
  // The QR encodes the device_pass so a reporter can scan it
  const qrValue = devicePass

  return (
    <div className="bg-[#2c161a] border border-[#52272f] rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📱</span>
        <div>
          <h3 className="font-display font-bold text-white">Mon appareil</h3>
          <p className="text-xs text-[#c9b0b4]">ID unique de cette session</p>
        </div>
      </div>

      <div className="flex justify-center p-4 bg-[#f3f4f6] rounded-2xl border border-[#52272f]">
        <QRCodeSVG
          value={qrValue}
          size={160}
          bgColor="#f3f4f6"
          fgColor="#111827"
          level="L"
        />
      </div>

      <div className="p-3 rounded-xl bg-[#211013] border border-[#52272f]">
        <p className="text-xs text-gray-400 mb-1">Device ID</p>
        <code className="text-xs text-[#e5b382] break-all font-mono">
          {devicePass}
        </code>
      </div>

      <p className="text-xs text-[#b89298] text-center leading-relaxed">
        Ce QR code est utilisé par un responsable témoin pour vous signaler si nécessaire.
      </p>
    </div>
  )
}
