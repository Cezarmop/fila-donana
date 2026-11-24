# Fila Digital – Restaurante & Churrascaria Don'Ana

Sistema de fila de espera por QR code (TCC). O cliente lê o QR code na porta, informa nome, sobrenome, celular
e número de pessoas, e acompanha a própria posição em tempo real. A recepção chama pelo painel: o cliente é avisado
pelo WhatsApp e a tela dele muda para "Sua mesa está pronta!". O recepcionista também pode chamar na porta e marcar
quem chegou ou não veio.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript (Vite), React Router |
| Backend | Node.js + TypeScript, Express 5, atualização por polling, Zod (validação) |
| Banco | PostgreSQL 16 |
| Testes | Vitest + Supertest |

## Telas

| Rota | Quem usa | O que faz |
|---|---|---|
| `/entrar` | Cliente (abre pelo QR) | Cadastro na fila com aceite de privacidade (LGPD) |
| `/acompanhar/:id?token=…` | Cliente | Posição em tempo real; aviso visual e vibração quando chamado; sair da fila |
| `/painel` | Recepção (senha) | Fila em ordem de chegada; Chamar, Chegou, Chamar de novo, Não veio, Remover; histórico de 12 h; **Adicionar à fila** (para quem tem dificuldade com o QR, celular opcional) e **QR code** na tela |
| `/cartaz` | Recepção | Cartaz com QR code para imprimir e colar na porta |

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 20+ e PostgreSQL (ou Docker).

```bash
docker compose up -d            # ou use um PostgreSQL local

cd server
cp .env.example .env            # ajuste PAINEL_SENHA e JWT_SECRET
npm install
npm run migrate                 # cria as tabelas
npm run dev                     # API em http://localhost:3333

cd ../web
npm install
npm run dev                     # site em http://localhost:5173 (acessível na rede local)
```

Para testar no celular na mesma rede Wi-Fi, abra `http://IP-DO-COMPUTADOR:5173/entrar`.
Para o QR do cartaz apontar para o endereço certo, defina `VITE_PUBLIC_URL` em `web/.env`.

Testes da API (atenção: limpam a tabela do banco do `DATABASE_URL`, use um banco de teste):

```bash
cd server && npm test
```

## Publicação (Vercel + domínio donana.cezbyte.com.br)

Na Vercel o site (`web/dist`) é servido como arquivo estático e a API Express roda como função
(`api/index.js`, que usa o mesmo `criarApp()` do servidor). A configuração está em `vercel.json`.
O build roda `migrate` no banco (o `schema.sql` pode rodar várias vezes sem problema), então o
`DATABASE_URL` precisa existir antes do primeiro deploy.

**Tempo real:** as funções da Vercel não mantêm um servidor WebSocket único compartilhado entre instâncias,
então as telas do cliente e do painel se atualizam por consulta periódica (*polling*) a cada 5 segundos,
pausando quando a aba fica em segundo plano. O aviso de "Sua mesa está pronta" aparece em até ~5 s.

Variáveis de ambiente (Vercel > Project > Settings > Environment Variables):
`DATABASE_URL` (PostgreSQL, ex.: Neon pela aba *Storage*), `PAINEL_SENHA`, `JWT_SECRET`,
`WEB_URL=https://donana.cezbyte.com.br`, `VITE_PUBLIC_URL=https://donana.cezbyte.com.br`, `WHATSAPP_MODO=link`.

Subdomínio: adicionar `donana.cezbyte.com.br` em *Settings > Domains* e criar na Hostinger
(hPanel > Domínios > cezbyte.com.br > DNS) o registro CNAME que a Vercel mostrar
(normalmente `donana` → `cname.vercel-dns.com`; use o valor exibido no painel da Vercel).

## App Android (APK de teste)

A pasta `android/` tem um app nativo simples (Java, WebView) que abre o site da fila dentro do celular.
Na primeira tela o usuário digita o endereço do servidor (ex.: `http://192.168.0.10:5173`) e escolhe
**Entrar na fila (cliente)** ou **Painel da recepção**. Links para o WhatsApp (`wa.me`) abrem no app do WhatsApp.

O APK **não funciona sozinho**: ele mostra as telas que vêm do computador que roda o site e a API.
Para testar, rode `server` e `web` como acima e deixe o celular na mesma rede Wi-Fi do computador.

Compilação: o workflow `.github/workflows/android-apk.yml` gera `app-debug.apk` no GitHub Actions
(aba *Actions* → execução → *Artifacts*). Localmente, com o Android SDK instalado: `cd android && ./gradlew assembleDebug`.

Limitações desta versão de teste: assinada com chave de *debug* (não serve para a Play Store) e permite HTTP sem
criptografia (`network_security_config.xml`). Depois do deploy com HTTPS, trocar para só HTTPS.

## Aviso pelo WhatsApp

Configurado por `WHATSAPP_MODO` no `server/.env`:

- **`link` (padrão, gratuito):** ao clicar em *Chamar*, o painel mostra o botão *Enviar no WhatsApp*, que abre
  `https://wa.me/<telefone>?text=<mensagem>` com a mensagem pronta; o recepcionista só aperta enviar.
- **`cloud_api` (oficial da Meta, pago por mensagem):** a API envia sozinha um *template* aprovado.
  Requer conta WhatsApp Business verificada, número dedicado, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` e um
  template com uma variável no corpo (`{{1}}` = nome). Se a API falhar, o painel cai de volta no link manual.

> **Verifique na documentação atual da Meta** (https://developers.facebook.com/docs/whatsapp/cloud-api) a versão
> da Graph API, o formato do envio de templates e os preços para o Brasil. Isso muda com frequência e o código em
> `server/src/notificador.ts` foi escrito com base no formato conhecido, sem ter sido testado contra a API real.

Bibliotecas não oficiais (ex.: Baileys, whatsapp-web.js) não foram usadas porque violam os termos do WhatsApp
e podem levar ao banimento do número.

## Modelo de dados

Tabela `entradas_fila` (`server/src/schema.sql`): nome, sobrenome, telefone (E.164), pessoas, status
(`aguardando` → `chamado` → `atendido` | `nao_compareceu`; ou `cancelado`), horários de entrada, chamada e
finalização, número de chamadas e data do consentimento. Cada entrada tem um `token` secreto: só quem tem o link
consegue ver ou cancelar a própria entrada, e o telefone nunca é exibido para o cliente.

## Decisões e limitações conhecidas (bom material para o TCC)

- As telas consultam a API a cada 5 s (polling), pausando com a aba em segundo plano; cada uma só recebe o que tem permissão de ver.
- O mesmo telefone não entra duas vezes na fila ativa (ler o QR de novo devolve a mesma entrada).
- Login do painel com uma senha única (`PAINEL_SENHA`) e token JWT de 14 h. Para vários funcionários, criar tabela de usuários.
- **A fazer:** limitar requisições por IP no cadastro (anti-spam), política de retenção/exclusão dos dados (LGPD),
  estimativa de tempo de espera, relatórios de tempo médio de espera.
