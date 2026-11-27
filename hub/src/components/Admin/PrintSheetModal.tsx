import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { copyToClipboard } from '../../services/clipboard'

interface Props {
  campaignName: string
  token: string
  onClose: () => void
}

export function PrintSheetModal({ campaignName, token, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  // En production : https://scoutgame.ch/?bootstrap=TOKEN
  // En local : URL du Hub avec le token
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scoutgame.ch'
  const qrUrl = `${origin}/?bootstrap=${encodeURIComponent(token)}`

  async function handleCopy() {
    const success = await copyToClipboard(qrUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // 8 bandelettes à découper par page A4
  const strips = Array.from({ length: 8 }, (_, i) => i)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      {/* Container - hide on print except printable area */}
      <div className="bg-[#162920] text-[#f3f4f6] rounded-2xl max-w-4xl w-full p-6 space-y-5 max-h-[95dvh] overflow-y-auto border border-[#2d6a4f] print:p-0 print:m-0 print:border-none print:bg-white print:text-black">
        {/* Modal Controls (Hidden when printing) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2d6a4f] print:hidden">
          <div>
            <h2 className="font-display font-bold text-lg text-[#f3f4f6]">
              Planche de bandelettes QR : {campaignName}
            </h2>
            <p className="text-xs text-slate-300">
              Format A4 prêt à imprimer. Découpez les bandelettes le long des pointillés.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-primary py-2 px-4 text-xs font-bold bg-[#388463] hover:bg-[#439973] border-[#2d6a4f] text-[#f3f4f6] flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Imprimer (A4)</span>
            </button>
            <button onClick={onClose} className="btn-ghost py-2 px-3 text-xs">
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* Clear Bootstrap URL + Copy Button (Hidden when printing) */}
        <div className="bg-[#0f1f18] border border-[#2d6a4f] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">
              Lien direct d'amorce AG (en clair)
            </span>
            <span className="text-xs font-mono text-emerald-300 break-all select-all">
              {qrUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`btn-ghost py-1.5 px-3 text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 border transition-all ${
              copied
                ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-300'
                : 'border-white/20 hover:border-scout-amber/50 text-white'
            }`}
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
          </button>
        </div>

        {/* Printable Sheet (Optimized for A4 print) */}
        <div className="print-sheet bg-white text-gray-900 p-6 rounded-xl border border-gray-200 print:border-none print:p-0 print:rounded-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {strips.map(index => (
              <div
                key={index}
                className="p-4 border-2 border-dashed border-gray-400 rounded-lg flex items-center gap-4 bg-white relative print:border-gray-500 print:break-inside-avoid"
              >
                {/* QR Code */}
                <div className="shrink-0 bg-white p-1 rounded border border-gray-300">
                  <QRCodeSVG
                    value={qrUrl}
                    size={90}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1">
                      <span>⚜️</span>
                      <span>Espace Maîtrise</span>
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {campaignName}
                    </span>
                  </div>

                  <p className="text-[11px] leading-snug font-medium text-gray-800 italic">
                    « Pour les carnotzets, troisièmes mi-temps et fins de journée de maîtrise. Scannez discrètement. Faites tourner uniquement entre responsables. »
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                    <span>scoutgame.ch</span>
                    <span>✂️ Découper</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-sheet, .print-sheet * {
            visibility: visible;
          }
          .print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
