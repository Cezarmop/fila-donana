import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Cabecalho from './Cabecalho'
import { api, lerEntradaLocal, mascaraTelefone, salvarEntradaLocal, type StatusCliente } from '../lib/api'

export default function Entrar() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [pessoas, setPessoas] = useState(2)
  const [consentimento, setConsentimento] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Se este celular já está na fila, volta direto para o acompanhamento.
  useEffect(() => {
    const local = lerEntradaLocal()
    if (!local) return
    api<StatusCliente>(`/api/fila/${local.id}?token=${local.token}`)
      .then((s) => {
        if (s.status === 'aguardando' || s.status === 'chamado') {
          navigate(`/acompanhar/${local.id}?token=${local.token}`, { replace: true })
        }
      })
      .catch(() => {})
  }, [navigate])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const r = await api<{ id: string; token: string }>('/api/fila', {
        body: { nome, sobrenome, telefone, pessoas, consentimento },
      })
      salvarEntradaLocal(r)
      navigate(`/acompanhar/${r.id}?token=${r.token}`, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar na fila')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pagina estreita">
      <Cabecalho subtitulo="Entre na fila de espera" />
      <form className="cartao" onSubmit={enviar}>
        <label>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" required maxLength={60} />
        </label>
        <label>
          Sobrenome
          <input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} autoComplete="family-name" required maxLength={80} />
        </label>
        <label>
          Celular (WhatsApp)
          <input
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(48) 99999-8888"
            required
          />
        </label>
        <label>
          Quantas pessoas?
          <div className="contador">
            <button type="button" onClick={() => setPessoas((p) => Math.max(1, p - 1))} aria-label="Menos uma pessoa">−</button>
            <span>{pessoas}</span>
            <button type="button" onClick={() => setPessoas((p) => Math.min(30, p + 1))} aria-label="Mais uma pessoa">+</button>
          </div>
        </label>
        <label className="check">
          <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required />
          <span>
            Autorizo o uso do meu nome e telefone apenas para organizar a fila e me avisar pelo WhatsApp quando minha mesa
            estiver pronta.
          </span>
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao primario" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar na fila'}
        </button>
      </form>
    </main>
  )
}
