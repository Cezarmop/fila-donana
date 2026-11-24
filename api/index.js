// Função da Vercel: recebe todas as rotas /api/* (ver vercel.json) e entrega para o Express.
// O servidor é compilado no build (server/dist) e o Express é exportado como handler.
import { criarApp } from '../server/dist/app.js';

export default criarApp();
