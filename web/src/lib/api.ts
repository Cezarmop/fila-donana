import { io } from 'socket.io-client'

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

/** Uma conexão só para o app todo. O servidor emite "fila:mudou" sem dados. */
export const socket = io({ autoConnect: true })

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
