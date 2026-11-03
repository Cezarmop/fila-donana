import { config } from './config.js';

export interface DadosChamada {
  nome: string;
  telefone: string; // E.164 sem "+"
}

export interface ResultadoNotificacao {
  /** "link": o recepcionista precisa abrir o link e apertar enviar. "enviado": a API já mandou. "erro": falhou. */
  tipo: 'link' | 'enviado' | 'erro';
  whatsappLink: string;
  detalhe?: string;
}

export function mensagemChamada(nome: string): string {
  return `Olá, ${nome}! Sua mesa no ${config.restauranteNome} está pronta. Por favor, dirija-se à recepção. 🍖`;
}

/** Link "clique para conversar" do WhatsApp, com a mensagem já preenchida. */
export function linkWhatsapp(dados: DadosChamada): string {
  return `https://wa.me/${dados.telefone}?text=${encodeURIComponent(mensagemChamada(dados.nome))}`;
}

/**
 * Envia a chamada pela WhatsApp Cloud API (oficial da Meta).
 *
 * ATENÇÃO: confira na documentação atual antes de usar em produção:
 * https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 * - A versão da Graph API (WHATSAPP_API_VERSAO) muda periodicamente.
 * - Mensagens iniciadas pela empresa precisam de um template APROVADO.
 *   Este código supõe um template com UMA variável no corpo ({{1}} = nome do cliente).
 * - Há custo por mensagem; consulte a tabela de preços da Meta.
 */
async function enviarCloudApi(dados: DadosChamada): Promise<void> {
  const { apiVersao, phoneNumberId, token, template, templateIdioma } = config.whatsapp;
  if (!phoneNumberId || !token) throw new Error('WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_TOKEN não configurados');

  const resposta = await fetch(`https://graph.facebook.com/${apiVersao}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: dados.telefone,
      type: 'template',
      template: {
        name: template,
        language: { code: templateIdioma },
        components: [{ type: 'body', parameters: [{ type: 'text', text: dados.nome }] }],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) {
    throw new Error(`WhatsApp API respondeu ${resposta.status}: ${await resposta.text()}`);
  }
}

export async function notificarChamada(dados: DadosChamada): Promise<ResultadoNotificacao> {
  const whatsappLink = linkWhatsapp(dados);
  if (config.whatsapp.modo !== 'cloud_api') return { tipo: 'link', whatsappLink };
  try {
    await enviarCloudApi(dados);
    return { tipo: 'enviado', whatsappLink };
  } catch (e) {
    // Se a API falhar, o recepcionista ainda pode usar o link manual.
    console.error('[whatsapp]', e);
    return { tipo: 'erro', whatsappLink, detalhe: e instanceof Error ? e.message : String(e) };
  }
}
