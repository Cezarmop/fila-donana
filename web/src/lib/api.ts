import { useEffect } from 'react'

export type Status = 'aguardando' | 'chamado' | 'atendido' | 'nao_compareceu' | 'cancelado'

export interface Entrada {
  id: string
  nome: string
  sobrenome: string
  telefone: string
  pessoas: number
  status: Status
  criado_em: string
  chamado_em: string | null
  finalizado_em: string | null
  vezes_chamado: number
}

export interface StatusCliente {
  id: string
  nome: string
  pessoas: number
  status: Status
  criado_em: string
  chamado_em: string | null
  posicao: number | null
}

export class ErroApi extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(caminho: string, opcoes: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const resposta = await fetch(caminho, {
    method: opcoes.method ?? (opcoes.body ? 'POST' : 'GET'),
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  })
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new ErroApi(dados.erro ?? 'Não foi possível falar com o servidor', resposta.status)
  return dados as T
}

/** Intervalo da atualização automática das telas (consulta periódica / polling). */
export const INTERVALO_ATUALIZACAO_MS = 5_000

/**
 * Atualiza a tela de tempos em tempos (polling). Substitui o WebSocket porque a hospedagem
 * (Vercel Functions) não garante uma conexão aberta e compartilhada entre instâncias.
 * Para quando a aba fica em segundo plano e atualiza na hora quando ela volta.
 */
export function useAtualizacaoPeriodica(carregar: () => void, intervaloMs = INTERVALO_ATUALIZACAO_MS) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const iniciar = () => {
      clearInterval(timer)
      carregar()
      timer = setInterval(carregar, intervaloMs)
    }
    const aoMudarVisibilidade = () => {
      if (document.hidden) clearInterval(timer)
      else iniciar()
    }
    iniciar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('online', iniciar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('online', iniciar)
    }
  }, [carregar, intervaloMs])
}

export function minutosDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

export function formatarTelefone(e164: string): string {
  const d = e164.startsWith('55') ? e164.slice(2) : e164
  const corte = d.length - 4
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`
}

/** Guarda a entrada do cliente neste aparelho, para ele voltar à tela se fechar o navegador. */
const CHAVE = 'fila-donana:entrada'
export function salvarEntradaLocal(e: { id: string; token: string }) {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)) } catch { /* modo privado */ }
}
export function lerEntradaLocal(): { id: string; token: string } | null {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? 'null') } catch { return null }
}
export function limparEntradaLocal() {
  try { localStorage.removeItem(CHAVE) } catch { /* ignore */ }
}
