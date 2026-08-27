-- Alfa Informática — token de acesso por pedido
--
-- Protege a página de acompanhamento (pedido-concluido.html) contra
-- enumeração de pedidos. O order_number é um timestamp base36, portanto
-- previsível — sem esse token, qualquer pessoa com UM número de pedido
-- conseguiria iterar os vizinhos e ver pedidos de outros clientes.
--
-- Arquitetura:
--   1. mp-create-payment gera 32 bytes criptográficos (CSPRNG) ao criar o pedido
--   2. O token é incluído no link do e-mail: ?pedido=ALFA-XXX&token=<64 hex chars>
--   3. A RPC buscar_pedido_por_numero valida AMBOS (número E token)
--   4. O token NUNCA é retornado pela RPC nem aparece em logs
--
-- Rodar no Supabase: SQL Editor > New query > colar e executar.

-- ── 1. Coluna e índice ────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders (access_token)
  WHERE access_token IS NOT NULL;

-- ── 2. Migração retroativa — gera token para pedidos existentes ──────────────
-- gen_random_bytes(32) vem da extensão pgcrypto, habilitada por padrão no
-- Supabase. Encode em hex dá 64 caracteres (256 bits de entropia).
-- A probabilidade de colisão é astronomicamente pequena (birthday bound
-- ≈ 2^128 pedidos antes do primeiro conflito esperado) — o índice UNIQUE
-- garante unicidade mesmo assim.

UPDATE public.orders
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;

-- ── 3. Confirma que todos os pedidos têm token ───────────────────────────────
DO $$
DECLARE
  sem_token BIGINT;
BEGIN
  SELECT count(*) INTO sem_token FROM public.orders WHERE access_token IS NULL;
  IF sem_token > 0 THEN
    RAISE EXCEPTION 'ERRO: % pedido(s) ainda sem access_token após migração', sem_token;
  ELSE
    RAISE NOTICE 'OK: todos os pedidos têm access_token.';
  END IF;
END;
$$;

-- ── 4. RPC atualizada ─────────────────────────────────────────────────────────
-- Remove o overload antigo (1 parâmetro) antes de criar o novo (2 parâmetros)
-- para evitar ambiguidade de assinatura.

DROP FUNCTION IF EXISTS public.buscar_pedido_por_numero(text);

CREATE OR REPLACE FUNCTION public.buscar_pedido_por_numero(p_numero text, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stored_token TEXT;
  resultado      JSONB;
BEGIN
  -- Busca o token armazenado para esse número de pedido.
  -- Não retorna nada se o pedido não existir OU se o token não bater.
  -- Isso cobre todos os cenários de ataque:
  --   • número válido + token errado  → NULL
  --   • número inválido + token certo → NULL (pedido não encontrado)
  --   • número inválido + token errado → NULL
  --   • sem token (string vazia)       → NULL
  SELECT o.access_token INTO v_stored_token
  FROM public.orders o
  WHERE o.order_number = p_numero;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Validação explícita: token deve existir e bater exatamente.
  -- Usar <> em vez de NOT FOUND previne bypass por NULL injection.
  IF v_stored_token IS NULL OR length(p_token) < 64 OR v_stored_token <> p_token THEN
    RETURN NULL;
  END IF;

  -- Expira pedidos PIX não pagos após 24h (efeito colateral seguro — só
  -- modifica o pedido cujo número E token já foram validados acima).
  UPDATE public.orders
  SET status = 'expirado'
  WHERE order_number = p_numero
    AND status = 'aguardando_pagamento'
    AND created_at < now() - interval '24 hours';

  -- Retorna apenas os campos necessários para exibição.
  -- Campos NUNCA retornados: access_token, user_id, address_snapshot,
  -- credenciais, dados internos do Mercado Pago, ambiente_teste.
  -- Dados do PIX (qr_code, qr_code_base64) são retornados somente para
  -- pedidos via PIX — protegidos pelo token acima.
  SELECT jsonb_build_object(
    'order_number',   o.order_number,
    'status',         o.status,
    'subtotal',       o.subtotal,
    'discount',       o.discount,
    'freight',        o.freight,
    'total',          o.total,
    'shipping_method', o.shipping_method,
    'payment_method', o.payment_method,
    'tracking_code',  o.tracking_code,
    'carrier',        o.carrier,
    'created_at',     o.created_at,
    'order_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_name_snapshot',  oi.product_name_snapshot,
        'product_image_snapshot', oi.product_image_snapshot,
        'qty',        oi.qty,
        'unit_price', oi.unit_price,
        'line_total', oi.line_total
      ))
      FROM public.order_items oi
      WHERE oi.order_id = o.id
    ), '[]'::jsonb),
    'pagamento', (
      SELECT jsonb_build_object(
        'status', p.status,
        'metodo', p.metodo,
        -- Retorna dados do PIX apenas para pedidos Pix (sem expor método de
        -- outro pedido); o frontend só exibe o QR quando status = pendente.
        'pix', CASE
          WHEN p.metodo = 'pix' THEN jsonb_build_object(
            'qr_code',        p.resposta_resumida->'pix'->>'qr_code',
            'qr_code_base64', p.resposta_resumida->'pix'->>'qr_code_base64',
            'ticket_url',     p.resposta_resumida->'pix'->>'ticket_url'
          )
          ELSE NULL
        END
      )
      FROM public.pagamentos p
      WHERE p.pedido_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 1
    )
  )
  INTO resultado
  FROM public.orders o
  WHERE o.order_number = p_numero;

  RETURN resultado;
END;
$$;

-- Mantém as mesmas permissões do overload anterior
GRANT EXECUTE ON FUNCTION public.buscar_pedido_por_numero(text, text) TO anon, authenticated, service_role;
