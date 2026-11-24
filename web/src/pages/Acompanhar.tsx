import { useCallback, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Cabecalho from './Cabecalho'
import { api, limparEntradaLocal, type StatusCliente, useAtualizacaoPeriodica } from '../lib/api'

export default function Acompanhar() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [dados, setDados] = useState<StatusCliente | null>(null)
  const [erro, setErro] = useState('')
  const statusAnterior = useRef<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const s = await api<StatusCliente>(`/api/fila/${id}?token=${token}`)
      // Ao ser chamado: vibra o celular (quando o navegador permite).
      if (s.status === 'chamado' && statusAnterior.current === 'aguardando') navigator.vibrate?.([300, 150, 300, 150, 300])
      statusAnterior.current = s.status
      setDados(s)
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    }
  }, [id, token])

  useAtualizacaoPeriodica(carregar)

  async function desistir() {
    if (!confirm('Deseja mesmo sair da fila?')) return
    await api(`/api/fila/${id}/cancelar`, { body: { token } }).catch(() => {})
    limparEntradaLocal()
    carregar()
  }

  if (erro && !dados) {
    return (
      <main className="pagina estreita">
        <Cabecalho />
        <div className="cartao centro">
          <p>{erro}</p>
          <Link className="botao primario" to="/entrar">Entrar na fila</Link>
        </div>
      </main>
    )
  }
  if (!dados) return <main className="pagina estreita"><Cabecalho /><p className="centro">Carregando…</p></main>

  return (
    <main className="pagina estreita">
      <Cabecalho />
      {dados.status === 'aguardando' && (
        <div className="cartao centro">
          <p>Olá, <strong>{dados.nome}</strong>! Você está na fila.</p>
          <p className="rotulo">Sua posição</p>
          <p className="posicao">{dados.posicao}º</p>
          <p className="discreto">
            {dados.pessoas} {dados.pessoas === 1 ? 'pessoa' : 'pessoas'} · Avisaremos pelo WhatsApp quando sua mesa estiver pronta.
            Pode deixar esta tela aberta, ela se atualiza sozinha.
          </p>
          <button className="botao secundario" onClick={desistir}>Sair da fila</button>
        </div>
      )}
      {dados.status === 'chamado' && (
        <div className="cartao centro chamado">
          <p className="grande">🔔 Sua mesa está pronta!</p>
          <p>{dados.nome}, por favor dirija-se à recepção.</p>
        </div>
      )}
      {dados.status === 'atendido' && (
        <div className="cartao centro"><p className="grande">Bom apetite! 🍖</p></div>
      )}
      {(dados.status === 'cancelado' || dados.status === 'nao_compareceu') && (
        <div className="cartao centro">
          <p>Você não está mais na fila.</p>
          <Link className="botao primario" to="/entrar" onClick={limparEntradaLocal}>Entrar novamente</Link>
        </div>
      )}
    </main>
  )
}
