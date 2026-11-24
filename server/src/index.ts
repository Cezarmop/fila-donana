import { createServer } from 'node:http';
import { config } from './config.js';
import { criarApp } from './app.js';

// Servidor para rodar localmente (npm run dev / npm start).
// Na Vercel quem recebe as requisições é api/index.js, que usa o mesmo criarApp().
// As telas se atualizam por consulta periódica (polling), então não há WebSocket.
const server = createServer(criarApp());

server.listen(config.port, () => {
  console.log(`API da fila rodando em http://localhost:${config.port}`);
});
