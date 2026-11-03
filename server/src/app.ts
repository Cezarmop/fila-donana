import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { config } from './config.js';
import { exigirRecepcao, gerarToken, senhaConfere } from './auth.js';
import { normalizarTelefoneBR } from './telefone.js';
import { notificarChamada } from './notificador.js';
import * as fila from './fila.js';

const uuid = z.uuid();

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(60),
  sobrenome: z.string().trim().min(2, 'Informe seu sobrenome').max(80),
  telefone: z.string().trim(),
  pessoas: z.coerce.number().int().min(1, 'Mínimo 1 pessoa').max(30, 'Para grupos acima de 30, fale com a recepção'),
  consentimento: z.literal(true, { error: 'É preciso aceitar o aviso de privacidade' }),
});

const statusSchema = z.object({
  status: z.enum(['atendido', 'nao_compareceu', 'cancelado', 'aguardando']),
});

/** `avisarMudanca` é chamado sempre que a fila muda, para atualizar as telas em tempo real. */
export function criarApp(avisarMudanca: () => void = () => {}) {
  const app = express();
  app.use(cors({ origin: config.webUrl }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/saude', (_req, res) => {
    res.json({ ok: true });
  });

  // ---------- Cliente (página aberta pelo QR code) ----------

  app.post('/api/fila', async (req, res) => {
    const parse = cadastroSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ erro: parse.error.issues[0]?.message ?? 'Dados inválidos' });
      return;
    }
    const telefone = normalizarTelefoneBR(parse.data.telefone);
    if (!telefone) {
      res.status(400).json({ erro: 'Telefone inválido. Use DDD + número, ex.: (48) 99999-8888' });
      return;
    }
    const existente = await fila.buscarAtivaPorTelefone(telefone);
    if (existente) {
      // Mesma pessoa leu o QR de novo: devolve a entrada que já existe em vez de duplicar.
      res.status(200).json({ ...existente, jaExistia: true });
      return;
    }
    const { nome, sobrenome, pessoas } = parse.data;
    const criada = await fila.criarEntrada({ nome, sobrenome, telefone, pessoas });
    avisarMudanca();
    res.status(201).json(criada);
  });

  app.get('/api/fila/:id', async (req, res) => {
    const token = String(req.query.token ?? '');
    if (!uuid.safeParse(req.params.id).success || !uuid.safeParse(token).success) {
      res.status(404).json({ erro: 'Entrada não encontrada' });
      return;
    }
    const status = await fila.statusDoCliente(req.params.id, token);
    if (!status) {
      res.status(404).json({ erro: 'Entrada não encontrada' });
      return;
    }
    res.json(status);
  });

  app.post('/api/fila/:id/cancelar', async (req, res) => {
    const token = String(req.body?.token ?? '');
    if (!uuid.safeParse(req.params.id).success || !uuid.safeParse(token).success) {
      res.status(404).json({ erro: 'Entrada não encontrada' });
      return;
    }
    const ok = await fila.cancelarPeloCliente(req.params.id, token);
    if (ok) avisarMudanca();
    res.status(ok ? 200 : 409).json({ ok });
  });

  // ---------- Recepção (painel) ----------

  app.post('/api/painel/login', (req, res) => {
    if (typeof req.body?.senha !== 'string' || !senhaConfere(req.body.senha)) {
      res.status(401).json({ erro: 'Senha incorreta' });
      return;
    }
    res.json({ token: gerarToken() });
  });

  app.get('/api/painel/fila', exigirRecepcao, async (_req, res) => {
    res.json(await fila.listarParaPainel());
  });

  app.post('/api/painel/fila/:id/chamar', exigirRecepcao, async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) {
      res.status(404).json({ erro: 'Entrada não encontrada' });
      return;
    }
    const entrada = await fila.chamar(String(req.params.id));
    if (!entrada) {
      res.status(409).json({ erro: 'Esta pessoa não está mais na fila' });
      return;
    }
    avisarMudanca();
    const notificacao = await notificarChamada({ nome: entrada.nome, telefone: entrada.telefone });
    res.json({ entrada, notificacao });
  });

  app.post('/api/painel/fila/:id/status', exigirRecepcao, async (req, res) => {
    const parse = statusSchema.safeParse(req.body);
    if (!parse.success || !uuid.safeParse(req.params.id).success) {
      res.status(400).json({ erro: 'Status inválido' });
      return;
    }
    const entrada = await fila.mudarStatus(String(req.params.id), parse.data.status);
    if (!entrada) {
      res.status(409).json({ erro: 'Não é possível mudar para esse status agora' });
      return;
    }
    avisarMudanca();
    res.json(entrada);
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  });

  return app;
}
