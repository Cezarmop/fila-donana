import { pool } from './db.js';

export type Status = 'aguardando' | 'chamado' | 'atendido' | 'nao_compareceu' | 'cancelado';

export interface Entrada {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string | null;
  pessoas: number;
  status: Status;
  origem: 'qr' | 'recepcao';
  criado_em: Date;
  chamado_em: Date | null;
  finalizado_em: Date | null;
  vezes_chamado: number;
}

const CAMPOS = 'id, nome, sobrenome, telefone, pessoas, status, origem, criado_em, chamado_em, finalizado_em, vezes_chamado';

export async function criarEntrada(dados: {
  nome: string; sobrenome: string; telefone: string | null; pessoas: number; origem?: 'qr' | 'recepcao';
}): Promise<{ id: string; token: string }> {
  const { rows } = await pool.query(
    `INSERT INTO entradas_fila (nome, sobrenome, telefone, pessoas, origem, consentimento_em)
     VALUES ($1, $2, $3, $4, $5, now()) RETURNING id, token`,
    [dados.nome, dados.sobrenome, dados.telefone, dados.pessoas, dados.origem ?? 'qr'],
  );
  return rows[0];
}

/** Telefone já está na fila ativa? Evita cadastros duplicados. */
export async function buscarAtivaPorTelefone(telefone: string): Promise<{ id: string; token: string } | null> {
  const { rows } = await pool.query(
    `SELECT id, token FROM entradas_fila WHERE telefone = $1 AND status IN ('aguardando','chamado') LIMIT 1`,
    [telefone],
  );
  return rows[0] ?? null;
}

/** Visão do próprio cliente: só funciona com o token secreto. Inclui a posição na fila. */
export async function statusDoCliente(id: string, token: string) {
  const { rows } = await pool.query(
    `SELECT e.id, e.nome, e.pessoas, e.status, e.criado_em, e.chamado_em,
            CASE WHEN e.status = 'aguardando' THEN (
              SELECT count(*)::int + 1 FROM entradas_fila o
              WHERE o.status = 'aguardando' AND o.criado_em < e.criado_em
            ) END AS posicao
     FROM entradas_fila e WHERE e.id = $1 AND e.token = $2`,
    [id, token],
  );
  return rows[0] ?? null;
}

export async function cancelarPeloCliente(id: string, token: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE entradas_fila SET status = 'cancelado', finalizado_em = now()
     WHERE id = $1 AND token = $2 AND status IN ('aguardando','chamado')`,
    [id, token],
  );
  return (rowCount ?? 0) > 0;
}

/** Fila para o painel: ativos (em ordem de chegada) + finalizados das últimas 12 horas. */
export async function listarParaPainel(): Promise<Entrada[]> {
  const { rows } = await pool.query(
    `SELECT ${CAMPOS} FROM entradas_fila
     WHERE status IN ('aguardando','chamado')
        OR finalizado_em > now() - interval '12 hours'
     ORDER BY CASE status WHEN 'chamado' THEN 0 WHEN 'aguardando' THEN 1 ELSE 2 END,
              CASE WHEN status IN ('aguardando','chamado') THEN criado_em END ASC,
              finalizado_em DESC`,
  );
  return rows;
}

export async function chamar(id: string): Promise<Entrada | null> {
  const { rows } = await pool.query(
    `UPDATE entradas_fila
     SET status = 'chamado', chamado_em = now(), vezes_chamado = vezes_chamado + 1
     WHERE id = $1 AND status IN ('aguardando','chamado')
     RETURNING ${CAMPOS}`,
    [id],
  );
  return rows[0] ?? null;
}

const TRANSICOES: Record<string, Status[]> = {
  atendido: ['aguardando', 'chamado'],
  nao_compareceu: ['chamado'],
  cancelado: ['aguardando', 'chamado'],
  aguardando: ['chamado', 'nao_compareceu'], // devolver para a fila (desfazer)
};

export async function mudarStatus(id: string, novo: Status): Promise<Entrada | null> {
  const origens = TRANSICOES[novo];
  if (!origens) return null;
  const finaliza = novo !== 'aguardando';
  const { rows } = await pool.query(
    `UPDATE entradas_fila
     SET status = $2, finalizado_em = ${finaliza ? 'now()' : 'NULL'}
     WHERE id = $1 AND status = ANY($3::status_entrada[])
     RETURNING ${CAMPOS}`,
    [id, novo, origens],
  );
  return rows[0] ?? null;
}
