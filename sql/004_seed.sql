-- ============================================================
-- META DASHBOARD — Seed inicial
-- Executar após 001_schema.sql
--
-- 1. Cria o tenant padrão
-- 2. Insere as 4 contas Meta já conhecidas
-- 3. Configura limiares padrão das regras
-- ============================================================

-- ============================================================
-- TENANT PADRÃO
-- ============================================================
INSERT INTO tenants (id, name, slug, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Arcanjo Digital',
  'arcanjo-digital',
  'pro'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CONTAS META
-- ============================================================
INSERT INTO meta_accounts (id, tenant_id, name, currency, timezone, is_active)
VALUES
  ('act_658261130272983',   '00000000-0000-0000-0000-000000000001', 'Arcanjo Miguel',  'BRL', 'America/Sao_Paulo', true),
  ('act_1068752855298767',  '00000000-0000-0000-0000-000000000001', 'Arcanjo Editr',   'BRL', 'America/Sao_Paulo', true),
  ('act_1586662202021021',  '00000000-0000-0000-0000-000000000001', 'Andreia Muller',  'BRL', 'America/Sao_Paulo', true),
  ('act_26307470372223756', '00000000-0000-0000-0000-000000000001', 'BM ADSLY01',      'BRL', 'America/Sao_Paulo', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RULE CONFIG — Limiares padrão (tenant_id NULL = global)
-- ============================================================
INSERT INTO rule_config (tenant_id, rule_key, value, description)
VALUES
  -- ROAS
  (null, 'roas_scale_threshold',    2.00, 'ROAS acima = candidato a escala'),
  (null, 'roas_maintain_threshold', 1.80, 'ROAS acima = manter ativo'),
  (null, 'roas_warning_threshold',  1.50, 'ROAS abaixo = alerta warning'),
  (null, 'roas_critical_threshold', 1.00, 'ROAS abaixo = alerta crítico'),

  -- Vendas
  (null, 'no_sales_days',           2,    'Dias sem vendas para disparar alerta'),
  (null, 'min_spend_for_alert',     50.0, 'Spend mínimo (R$) para disparar alertas de sem-venda'),

  -- Frequência
  (null, 'frequency_warning',       3.0,  'Frequência que gera warning'),
  (null, 'frequency_critical',      5.0,  'Frequência que gera alerta crítico'),

  -- CTR
  (null, 'ctr_drop_pct',            30.0, 'Queda % de CTR em relação à média para alertar'),
  (null, 'ctr_min_warning',         0.8,  'CTR absoluto abaixo = warning'),

  -- Criativos
  (null, 'no_creative_test_days',   10,   'Dias sem novo criativo para alertar'),

  -- Score
  (null, 'score_scale_min',         75,   'Score mínimo para classificar como scale'),
  (null, 'score_pause_max',         35,   'Score máximo para classificar como pause'),

  -- Backfill
  (null, 'backfill_days',           90,   'Quantos dias buscar no backfill inicial')

ON CONFLICT (tenant_id, rule_key) DO NOTHING;
