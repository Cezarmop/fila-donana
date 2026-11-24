import 'dotenv/config';

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida (veja .env.example)`);
  return valor;
}

export const config = {
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: obrigatoria('DATABASE_URL'),
  painelSenha: obrigatoria('PAINEL_SENHA'),
  jwtSecret: obrigatoria('JWT_SECRET'),
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  // Pasta do site compilado; se não for definida, usa ../../web/dist (relativo a dist/)
  webDist: process.env.WEB_DIST || undefined,
  restauranteNome: process.env.RESTAURANTE_NOME ?? "Don'Ana",
  whatsapp: {
    modo: (process.env.WHATSAPP_MODO ?? 'link') as 'link' | 'cloud_api',
    apiVersao: process.env.WHATSAPP_API_VERSAO ?? 'v21.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    token: process.env.WHATSAPP_TOKEN ?? '',
    template: process.env.WHATSAPP_TEMPLATE ?? 'chamada_fila',
    templateIdioma: process.env.WHATSAPP_TEMPLATE_IDIOMA ?? 'pt_BR',
  },
};
