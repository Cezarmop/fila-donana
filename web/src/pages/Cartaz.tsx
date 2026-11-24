import QrEntrada from './QrEntrada'
import { urlEntrada } from '../lib/api'

/** Cartaz para imprimir e colar na porta ou no balcão da recepção. O QR aponta para /entrar. */
export default function Cartaz() {
  return (
    <main className="cartaz">
      <img src="/logo.png" alt="Restaurante & Churrascaria Don'Ana" />
      <h1>Entre na fila pelo celular</h1>
      <QrEntrada />
      <ol>
        <li>Aponte a câmera para o código</li>
        <li>Preencha nome, sobrenome e celular</li>
        <li>Avisamos pelo WhatsApp quando sua mesa estiver pronta</li>
      </ol>
      <p>Não conseguiu? Peça para a recepção colocar seu nome na fila.</p>
      <p className="discreto">{urlEntrada()}</p>
      <button className="botao primario nao-imprimir" onClick={() => window.print()}>Imprimir</button>
    </main>
  )
}
