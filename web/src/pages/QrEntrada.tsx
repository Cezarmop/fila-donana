import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { urlEntrada } from '../lib/api'

/** QR code que leva para /entrar. Usado no cartaz impresso e na tela da recepção. */
export default function QrEntrada({ className = 'qr' }: { className?: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    QRCode.toString(urlEntrada(), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [])
  return <div className={className} role="img" aria-label="QR code para entrar na fila" dangerouslySetInnerHTML={{ __html: svg }} />
}
