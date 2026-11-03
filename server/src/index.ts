import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { criarApp } from './app.js';

let io: Server;
// Não manda dados pelo socket: só avisa que "algo mudou" e cada tela busca o que pode ver.
const app = criarApp(() => io.emit('fila:mudou'));
const server = createServer(app);
io = new Server(server, { cors: { origin: config.webUrl } });

server.listen(config.port, () => {
  console.log(`API da fila rodando em http://localhost:${config.port}`);
});
