import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Cartaz para imprimir e colar na porta. O QR aponta para /entrar deste mesmo site. */
export default function Cartaz() {
  const url = `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/entrar`
  const [svg, setSvg] = useState('')
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg)
  }, [url])
  return (
    <main className="cartaz">
      <img src="/logo.png" alt="Restaurante & Churrascaria Don'Ana" />
      <h1>Entre na fila pelo celular</h1>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <ol>
        <li>Aponte a câmera para o código</li>
        <li>Preencha nome, sobrenome e celular</li>
        <li>Avisamos pelo WhatsApp quando sua mesa estiver pronta</li>
      </ol>
      <p className="discreto">{url}</p>
      <button className="botao primario nao-imprimir" onClick={() => window.print()}>Imprimir</button>
    </main>
  )
}
