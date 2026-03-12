-- ============================================================
-- META DASHBOARD — Schema Principal
-- Executar no editor SQL do Supabase
-- ============================================================

-- ============================================================
-- TENANTS (workspaces / clientes do SaaS)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  plan       TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER PROFILES (extensão do auth.users do Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  name      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- META ACCOUNTS (contas de anúncio)
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_accounts (
  id             TEXT PRIMARY KEY,              -- "act_658261130272983"
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  currency       TEXT DEFAULT 'BRL',
  timezone       TEXT DEFAULT 'America/Sao_Paulo',
  access_token   TEXT,                          -- criptografar em prod
  is_active      BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  objective        TEXT,
  status           TEXT,
  effective_status TEXT,
  daily_budget     NUMERIC(14,2),
  lifetime_budget  NUMERIC(14,2),
  start_time       TIMESTAMPTZ,
  stop_time        TIMESTAMPTZ,
  created_time     TIMESTAMPTZ,
  updated_time     TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ADSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS adsets (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id        TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  status            TEXT,
  effective_status  TEXT,
  daily_budget      NUMERIC(14,2),
  lifetime_budget   NUMERIC(14,2),
  optimization_goal TEXT,
  billing_event     TEXT,
  targeting         JSONB,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  created_time      TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CREATIVES (antes de ads, por causa da FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS creatives (
  id                  TEXT PRIMARY KEY,
  account_id          TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT,
  title               TEXT,
  body                TEXT,
  image_url           TEXT,
  video_id            TEXT,
  thumbnail_url       TEXT,
  call_to_action_type TEXT,
  object_type         TEXT,
  raw                 JSONB,
  synced_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ADS
-- ============================================================
CREATE TABLE IF NOT EXISTS ads (
  id               TEXT PRIMARY KEY,
  adset_id         TEXT NOT NULL REFERENCES adsets(id) ON DELETE CASCADE,
  campaign_id      TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id       TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  status           TEXT,
  effective_status TEXT,
  creative_id      TEXT REFERENCES creatives(id),
  created_time     TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INSIGHT DAILY
-- Granularidade: 1 linha por (date, level, entity_id)
-- level: campaign | adset | ad
-- ============================================================
CREATE TABLE IF NOT EXISTS insight_daily (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  level           TEXT NOT NULL CHECK (level IN ('campaign', 'adset', 'ad')),
  entity_id       TEXT NOT NULL,
  entity_name     TEXT,

  -- Volume
  impressions     BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  spend           NUMERIC(14,4) DEFAULT 0,

  -- Rates (armazenadas para performance)
  ctr             NUMERIC(10,6) DEFAULT 0,
  cpc             NUMERIC(14,4) DEFAULT 0,
  cpm             NUMERIC(14,4) DEFAULT 0,
  frequency       NUMERIC(10,4) DEFAULT 0,

  -- Clicks detalhado
  link_clicks     BIGINT DEFAULT 0,
  unique_clicks   BIGINT DEFAULT 0,

  -- Engajamento
  page_engagement BIGINT DEFAULT 0,
  video_views     BIGINT DEFAULT 0,

  -- Conversões
  purchases       INT DEFAULT 0,
  purchase_value  NUMERIC(14,4) DEFAULT 0,

  -- Computed
  roas            NUMERIC(12,4) DEFAULT 0,
  cpa             NUMERIC(14,4),               -- NULL se sem compras

  -- Extensível
  actions         JSONB,
  action_values   JSONB,

  synced_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE (date, level, entity_id)
);

-- ============================================================
-- INSIGHT HOURLY
-- Meta API: breakdowns=hourly_stats_aggregated_by_advertiser_time_zone
-- Disponível nos últimos ~7 dias
-- ============================================================
CREATE TABLE IF NOT EXISTS insight_hourly (
  id              BIGSERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  hour            SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL REFERENCES meta_accounts(id) ON DELETE CASCADE,
  level           TEXT NOT NULL CHECK (level IN ('campaign', 'adset')),
  entity_id       TEXT NOT NULL,
  entity_name     TEXT,

  impressions     BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  spend           NUMERIC(14,4) DEFAULT 0,
  reach           BIGINT DEFAULT 0,
  ctr             NUMERIC(10,6) DEFAULT 0,
  cpc             NUMERIC(14,4) DEFAULT 0,
  cpm             NUMERIC(14,4) DEFAULT 0,
  purchases       INT DEFAULT 0,
  purchase_value  NUMERIC(14,4) DEFAULT 0,
  roas            NUMERIC(12,4) DEFAULT 0,

  actions         JSONB,
  action_values   JSONB,

  synced_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE (date, hour, level, entity_id)
);

-- ============================================================
-- SYNC LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id     TEXT REFERENCES meta_accounts(id),
  sync_type      TEXT NOT NULL CHECK (sync_type IN ('backfill', 'incremental', 'hourly', 'manual')),
  status         TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  date_from      DATE,
  date_to        DATE,
  rows_inserted  INT DEFAULT 0,
  rows_updated   INT DEFAULT 0,
  error_message  TEXT,
  started_at     TIMESTAMPTZ DEFAULT now(),
  finished_at    TIMESTAMPTZ
);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      TEXT REFERENCES meta_accounts(id),
  entity_id       TEXT,
  entity_type     TEXT CHECK (entity_type IN ('account', 'campaign', 'adset', 'ad')),
  entity_name     TEXT,
  alert_type      TEXT NOT NULL,
  severity        TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title           TEXT NOT NULL,
  message         TEXT,
  metric_value    NUMERIC,
  threshold_value NUMERIC,
  is_read         BOOLEAN DEFAULT false,
  is_dismissed    BOOLEAN DEFAULT false,
  date_ref        DATE,
  generated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (entity_id, alert_type, date_ref)
);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id   TEXT REFERENCES meta_accounts(id),
  entity_id    TEXT,
  entity_type  TEXT,
  entity_name  TEXT,
  action       TEXT NOT NULL CHECK (action IN ('scale', 'pause', 'observe', 'test_creative', 'test_audience')),
  reason       TEXT NOT NULL,
  confidence   NUMERIC(4,2) CHECK (confidence >= 0 AND confidence <= 1),
  data_context JSONB,
  source       TEXT DEFAULT 'rules' CHECK (source IN ('rules', 'ai')),
  is_applied   BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ
);

-- ============================================================
-- CAMPAIGN SCORES (histórico)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_scores (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  score          NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  classification TEXT CHECK (classification IN ('scale', 'maintain', 'observe', 'test_creative', 'pause')),
  score_details  JSONB,
  computed_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (campaign_id, date)
);

-- ============================================================
-- RULE CONFIG (limiares configuráveis por tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS rule_config (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = padrão global
  rule_key    TEXT NOT NULL,
  value       NUMERIC NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, rule_key)
);
