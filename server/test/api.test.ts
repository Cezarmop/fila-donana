import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { pool } from '../src/db.js';

// Usa o banco do DATABASE_URL: rode contra um banco de TESTE, pois a tabela é limpa.
let avisos = 0;
const app = criarApp(() => { avisos++; });
let tokenPainel = '';

const cliente = (o: Partial<Record<string, unknown>> = {}) => ({
  nome: 'Maria', sobrenome: 'Silva', telefone: '(48) 99999-0001', pessoas: 2, consentimento: true, ...o,
});

beforeAll(async () => {
  const r = await request(app).post('/api/painel/login').send({ senha: process.env.PAINEL_SENHA });
  tokenPainel = r.body.token;
});
beforeEach(async () => { await pool.query('TRUNCATE entradas_fila'); avisos = 0; });
afterAll(async () => { await pool.end(); });

describe('cadastro do cliente', () => {
  it('cria entrada e informa posição', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    const b = await request(app).post('/api/fila').send(cliente({ nome: 'João', telefone: '48999990002' }));
    expect(a.status).toBe(201);
    expect(avisos).toBe(2);
    const st = await request(app).get(`/api/fila/${b.body.id}`).query({ token: b.body.token });
    expect(st.body).toMatchObject({ nome: 'João', status: 'aguardando', posicao: 2 });
    expect(st.body.telefone).toBeUndefined();
  });

  it('não duplica o mesmo telefone na fila', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    const b = await request(app).post('/api/fila').send(cliente({ telefone: '+55 48 99999-0001' }));
    expect(b.status).toBe(200);
    expect(b.body).toMatchObject({ id: a.body.id, jaExistia: true });
  });

  it('valida campos e consentimento', async () => {
    expect((await request(app).post('/api/fila').send(cliente({ consentimento: false }))).status).toBe(400);
    expect((await request(app).post('/api/fila').send(cliente({ telefone: '123' }))).status).toBe(400);
    expect((await request(app).post('/api/fila').send(cliente({ nome: '' }))).status).toBe(400);
  });

  it('não mostra a entrada com token errado', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    const r = await request(app).get(`/api/fila/${a.body.id}`).query({ token: crypto.randomUUID() });
    expect(r.status).toBe(404);
  });

  it('cliente pode desistir', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    const r = await request(app).post(`/api/fila/${a.body.id}/cancelar`).send({ token: a.body.token });
    expect(r.body.ok).toBe(true);
  });
});

describe('painel', () => {
  it('exige login', async () => {
    expect((await request(app).get('/api/painel/fila')).status).toBe(401);
    expect((await request(app).post('/api/painel/login').send({ senha: 'errada' })).status).toBe(401);
  });

  it('chama, gera link do WhatsApp e atualiza posições', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    const b = await request(app).post('/api/fila').send(cliente({ nome: 'João', telefone: '48999990002' }));
    const auth = { Authorization: `Bearer ${tokenPainel}` };

    const r = await request(app).post(`/api/painel/fila/${a.body.id}/chamar`).set(auth);
    expect(r.status).toBe(200);
    expect(r.body.notificacao.tipo).toBe('link');
    expect(r.body.notificacao.whatsappLink).toMatch(/^https:\/\/wa\.me\/5548999990001\?text=Ol%C3%A1%2C%20Maria/);

    const stA = await request(app).get(`/api/fila/${a.body.id}`).query({ token: a.body.token });
    expect(stA.body).toMatchObject({ status: 'chamado', posicao: null });
    const stB = await request(app).get(`/api/fila/${b.body.id}`).query({ token: b.body.token });
    expect(stB.body.posicao).toBe(1);

    const fim = await request(app).post(`/api/painel/fila/${a.body.id}/status`).set(auth).send({ status: 'atendido' });
    expect(fim.body.status).toBe('atendido');
    // não pode chamar quem já foi atendido
    expect((await request(app).post(`/api/painel/fila/${a.body.id}/chamar`).set(auth)).status).toBe(409);

    const lista = await request(app).get('/api/painel/fila').set(auth);
    expect(lista.body.map((e: { nome: string }) => e.nome)).toEqual(['João', 'Maria']);
  });
});

describe('cadastro pela recepção', () => {
  const auth = () => ({ Authorization: `Bearer ${tokenPainel}` });

  it('exige login', async () => {
    expect((await request(app).post('/api/painel/fila').send({ nome: 'Ana', pessoas: 2, consentimento: true })).status).toBe(401);
  });

  it('adiciona sem telefone e chama sem WhatsApp', async () => {
    const r = await request(app).post('/api/painel/fila').set(auth()).send({ nome: 'Seu José', pessoas: 3, consentimento: true });
    expect(r.status).toBe(201);
    expect(avisos).toBe(1);
    const lista = await request(app).get('/api/painel/fila').set(auth());
    expect(lista.body[0]).toMatchObject({ nome: 'Seu José', sobrenome: '', telefone: null, pessoas: 3, origem: 'recepcao' });
    const c = await request(app).post(`/api/painel/fila/${r.body.id}/chamar`).set(auth());
    expect(c.status).toBe(200);
    expect(c.body.notificacao).toBeNull();
  });

  it('entra na mesma fila, na ordem de chegada', async () => {
    const a = await request(app).post('/api/fila').send(cliente());
    await request(app).post('/api/painel/fila').set(auth()).send({ nome: 'Rita', telefone: '(48) 98888-0003', pessoas: 2, consentimento: true });
    const lista = await request(app).get('/api/painel/fila').set(auth());
    expect(lista.body.map((e: { nome: string }) => e.nome)).toEqual(['Maria', 'Rita']);
    expect(lista.body[0]).toMatchObject({ id: a.body.id, origem: 'qr' });
  });

  it('valida telefone, consentimento e duplicidade', async () => {
    const base = { nome: 'Rita', pessoas: 2, consentimento: true };
    expect((await request(app).post('/api/painel/fila').set(auth()).send({ ...base, consentimento: false })).status).toBe(400);
    expect((await request(app).post('/api/painel/fila').set(auth()).send({ ...base, telefone: '123' })).status).toBe(400);
    await request(app).post('/api/fila').send(cliente());
    const dup = await request(app).post('/api/painel/fila').set(auth()).send({ ...base, telefone: '48999990001' });
    expect(dup.status).toBe(409);
  });
});
