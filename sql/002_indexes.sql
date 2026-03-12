-- ============================================================
-- META DASHBOARD — Índices
-- Executar após 001_schema.sql
-- ============================================================

-- insight_daily: queries mais frequentes (por período + conta + entidade)
CREATE INDEX IF NOT EXISTS idx_insight_daily_tenant_date
  ON insight_daily(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_insight_daily_account_date
  ON insight_daily(account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_insight_daily_entity_date
  ON insight_daily(entity_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_insight_daily_level_date
  ON insight_daily(level, date DESC);

-- Composto para queries de período por conta + nível
CREATE INDEX IF NOT EXISTS idx_insight_daily_account_level_date
  ON insight_daily(account_id, level, date DESC);

-- insight_hourly
CREATE INDEX IF NOT EXISTS idx_insight_hourly_entity_date
  ON insight_hourly(entity_id, date DESC, hour);

CREATE INDEX IF NOT EXISTS idx_insight_hourly_tenant_date
  ON insight_hourly(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_insight_hourly_account_date
  ON insight_hourly(account_id, date DESC);

-- alerts: feed em tempo real (não lidos, recentes)
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_active
  ON alerts(tenant_id, is_dismissed, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_entity
  ON alerts(entity_id, alert_type);

CREATE INDEX IF NOT EXISTS idx_alerts_severity
  ON alerts(tenant_id, severity, is_dismissed);

-- campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_account
  ON campaigns(account_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant
  ON campaigns(tenant_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns(tenant_id, effective_status);

-- adsets
CREATE INDEX IF NOT EXISTS idx_adsets_campaign
  ON adsets(campaign_id);

CREATE INDEX IF NOT EXISTS idx_adsets_account
  ON adsets(account_id);

-- ads
CREATE INDEX IF NOT EXISTS idx_ads_adset
  ON ads(adset_id);

CREATE INDEX IF NOT EXISTS idx_ads_campaign
  ON ads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ads_creative
  ON ads(creative_id);

-- campaign_scores
CREATE INDEX IF NOT EXISTS idx_campaign_scores_date
  ON campaign_scores(campaign_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_scores_tenant_date
  ON campaign_scores(tenant_id, date DESC);

-- sync_log
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant_status
  ON sync_log(tenant_id, status, started_at DESC);

-- recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_tenant
  ON recommendations(tenant_id, is_applied, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_entity
  ON recommendations(entity_id, action);

-- meta_accounts
CREATE INDEX IF NOT EXISTS idx_meta_accounts_tenant
  ON meta_accounts(tenant_id, is_active);
