import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Cabecalho from './Cabecalho'
import { api, ErroApi, formatarTelefone, minutosDesde, type Entrada, type Status, useAtualizacaoPeriodica } from '../lib/api'

const CHAVE_TOKEN = 'fila-donana:painel'

interface Notificacao { tipo: 'link' | 'enviado' | 'erro'; whatsappLink: string; detalhe?: string }

const ROTULO: Record<Status, string> = {
  aguardando: 'Aguardando',
  chamado: 'Chamado',
  atendido: 'Atendido',
  nao_compareceu: 'Não compareceu',
  cancelado: 'Cancelado',
}

function Login({ aoEntrar }: { aoEntrar: (t: string) => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await api<{ token: string }>('/api/painel/login', { body: { senha } })
      aoEntrar(r.token)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    }
  }
  return (
    <main className="pagina estreita">
      <Cabecalho subtitulo="Painel da recepção" />
      <form className="cartao" onSubmit={enviar}>
        <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao primario">Entrar</button>
      </form>
    </main>
  )
}

export default function Painel() {
  const [token, setToken] = useState(() => sessionStorage.getItem(CHAVE_TOKEN) ?? '')
  const [fila, setFila] = useState<Entrada[]>([])
  const [avisos, setAvisos] = useState<Record<string, Notificacao>>({})
  const [erro, setErro] = useState('')
  const [, setRelogio] = useState(0)

  const sair = useCallback(() => { sessionStorage.removeItem(CHAVE_TOKEN); setToken('') }, [])

  const carregar = useCallback(async () => {
    if (!token) return
    try {
      setFila(await api<Entrada[]>('/api/painel/fila', { token }))
      setErro('')
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) sair()
      else setErro(e instanceof Error ? e.message : 'Erro')
    }
  }, [token, sair])

  useAtualizacaoPeriodica(carregar)
  useEffect(() => {
    const tique = setInterval(() => setRelogio((n) => n + 1), 30_000) // atualiza os "há X min"
    return () => clearInterval(tique)
  }, [])

  if (!token) return <Login aoEntrar={(t) => { sessionStorage.setItem(CHAVE_TOKEN, t); setToken(t) }} />

  async function chamar(e: Entrada) {
    try {
      const r = await api<{ notificacao: Notificacao }>(`/api/painel/fila/${e.id}/chamar`, { method: 'POST', token })
      setAvisos((a) => ({ ...a, [e.id]: r.notificacao }))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    }
    carregar()
  }

  async function mudar(e: Entrada, status: Status) {
    try {
      await api(`/api/painel/fila/${e.id}/status`, { body: { status }, token })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    }
    carregar()
  }

  const ativos = fila.filter((e) => e.status === 'aguardando' || e.status === 'chamado')
  const finalizados = fila.filter((e) => !ativos.includes(e))
  const aguardando = ativos.filter((e) => e.status === 'aguardando')
  const pessoasAguardando = aguardando.reduce((s, e) => s + e.pessoas, 0)

  return (
    <main className="pagina larga">
      <div className="barra-painel">
        <img src="/logo.png" alt="Don'Ana" />
        <div className="resumo">
          <span><strong>{aguardando.length}</strong> grupos aguardando</span>
          <span><strong>{pessoasAguardando}</strong> pessoas</span>
        </div>
        <button className="botao secundario pequeno" onClick={sair}>Sair</button>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {ativos.length === 0 && <p className="cartao centro discreto">Ninguém na fila agora.</p>}
      <ol className="lista-fila">
        {ativos.map((e) => {
          const aviso = avisos[e.id]
          const posicao = aguardando.indexOf(e) + 1
          return (
            <li key={e.id} className={`item ${e.status}`}>
              <div className="pos">{e.status === 'chamado' ? '🔔' : `${posicao}º`}</div>
              <div className="info">
                <strong>{e.nome} {e.sobrenome}</strong>
                <span>{e.pessoas} {e.pessoas === 1 ? 'pessoa' : 'pessoas'} · <span className="nowrap">{formatarTelefone(e.telefone)}</span></span>
                <span className="discreto">
                  Na fila há {minutosDesde(e.criado_em)} min
                  {e.chamado_em && e.status === 'chamado' && ` · chamado há ${minutosDesde(e.chamado_em)} min`}
                  {e.vezes_chamado > 1 && ` · ${e.vezes_chamado}x`}
                </span>
                {aviso?.tipo === 'erro' && <span className="erro">WhatsApp falhou: use o botão abaixo.</span>}
                {aviso?.tipo === 'enviado' && <span className="ok">Mensagem enviada pelo WhatsApp ✓</span>}
              </div>
              <div className="acoes">
                {e.status === 'aguardando' ? (
                  <button className="botao primario" onClick={() => chamar(e)}>Chamar</button>
                ) : (
                  <>
                    {aviso && aviso.tipo !== 'enviado' && (
                      <a className="botao whatsapp" href={aviso.whatsappLink} target="_blank" rel="noreferrer">
                        Enviar no WhatsApp
                      </a>
                    )}
                    <button className="botao primario" onClick={() => mudar(e, 'atendido')}>Chegou ✓</button>
                    <button className="botao secundario" onClick={() => chamar(e)}>Chamar de novo</button>
                    <button className="botao secundario" onClick={() => mudar(e, 'nao_compareceu')}>Não veio</button>
                  </>
                )}
                {e.status === 'aguardando' && (
                  <>
                    <button className="botao secundario" onClick={() => mudar(e, 'atendido')}>Sentou</button>
                    <button className="botao secundario" onClick={() => mudar(e, 'cancelado')}>Remover</button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {finalizados.length > 0 && (
        <details className="historico">
          <summary>Finalizados nas últimas 12 horas ({finalizados.length})</summary>
          <ul>
            {finalizados.map((e) => (
              <li key={e.id}>
                <span>{e.nome} {e.sobrenome} · {e.pessoas}p · {ROTULO[e.status]}</span>
                {e.status === 'nao_compareceu' && (
                  <button className="botao secundario pequeno" onClick={() => mudar(e, 'aguardando')}>Voltar à fila</button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  )
}
