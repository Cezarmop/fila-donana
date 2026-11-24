CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE status_entrada AS ENUM ('aguardando', 'chamado', 'atendido', 'nao_compareceu', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS entradas_fila (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- token secreto que só o cliente recebe, para acompanhar/cancelar a própria entrada
  token           UUID NOT NULL DEFAULT gen_random_uuid(),
  nome            VARCHAR(60)  NOT NULL,
  sobrenome       VARCHAR(80)  NOT NULL,
  telefone        VARCHAR(15)  NOT NULL, -- formato E.164 sem "+", ex.: 5548999998888
  pessoas         SMALLINT     NOT NULL CHECK (pessoas BETWEEN 1 AND 30),
  status          status_entrada NOT NULL DEFAULT 'aguardando',
  consentimento_em TIMESTAMPTZ NOT NULL, -- aceite do aviso de privacidade (LGPD)
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  chamado_em      TIMESTAMPTZ,
  finalizado_em   TIMESTAMPTZ,
  vezes_chamado   SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_entradas_status_criado ON entradas_fila (status, criado_em);

-- v2: a recepção pode cadastrar quem tem dificuldade com o QR code.
-- Telefone passa a ser opcional (sem telefone, a recepção chama na porta)
-- e a coluna "origem" registra quem fez o cadastro (útil para métricas do TCC).
ALTER TABLE entradas_fila ALTER COLUMN telefone DROP NOT NULL;
ALTER TABLE entradas_fila ADD COLUMN IF NOT EXISTS origem VARCHAR(10) NOT NULL DEFAULT 'qr';
