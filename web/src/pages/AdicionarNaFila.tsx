import { useState, type FormEvent } from 'react'
import { api, mascaraTelefone } from '../lib/api'

/** Formulário do painel para a recepção colocar na fila quem tem dificuldade com o QR code. */
export default function AdicionarNaFila({ token, aoAdicionar, aoFechar }: {
  token: string
  aoAdicionar: () => void
  aoFechar: () => void
}) {
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pessoas, setPessoas] = useState(2)
  const [consentimento, setConsentimento] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await api('/api/painel/fila', { body: { nome, sobrenome, telefone, pessoas, consentimento }, token })
      setNome(''); setSobrenome(''); setTelefone(''); setPessoas(2); setConsentimento(false)
      aoAdicionar()
      aoFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="cartao adicionar" onSubmit={enviar}>
      <h2>Adicionar à fila</h2>
      <div className="linha-campos">
        <label>Nome<input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={60} autoFocus /></label>
        <label>Sobrenome <span className="discreto">(opcional)</span>
          <input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} maxLength={80} />
        </label>
      </div>
      <div className="linha-campos">
        <label>Celular <span className="discreto">(opcional, para o WhatsApp)</span>
          <input value={telefone} onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} inputMode="tel" placeholder="(48) 99999-8888" />
        </label>
        <label>Pessoas
          <div className="contador">
            <button type="button" onClick={() => setPessoas((p) => Math.max(1, p - 1))} aria-label="Menos uma pessoa">−</button>
            <span>{pessoas}</span>
            <button type="button" onClick={() => setPessoas((p) => Math.min(30, p + 1))} aria-label="Mais uma pessoa">+</button>
          </div>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required />
        <span>O cliente autorizou o uso do nome e telefone apenas para organizar a fila e avisá-lo.</span>
      </label>
      {!telefone && <p className="discreto">Sem celular, o cliente não recebe WhatsApp: chame-o pelo nome na porta.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes-form">
        <button type="button" className="botao secundario" onClick={aoFechar}>Cancelar</button>
        <button className="botao primario" disabled={enviando}>{enviando ? 'Adicionando…' : 'Adicionar à fila'}</button>
      </div>
    </form>
  )
}
