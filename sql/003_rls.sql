-- ============================================================
-- META DASHBOARD — Row Level Security
-- Executar após 001_schema.sql
--
-- IMPORTANTE: O server.js usa a chave service_role,
-- que ignora RLS automaticamente. Essas policies protegem
-- acesso direto via SDK do cliente (browser).
-- ============================================================

-- Helper: retorna tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- Habilitar RLS em todas as tabelas
-- ============================================================
ALTER TABLE meta_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE adsets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_daily     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_hourly    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_config       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies: SELECT (leitura restrita ao próprio tenant)
-- ============================================================
CREATE POLICY "tenant_select" ON meta_accounts
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON campaigns
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON adsets
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON ads
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON creatives
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON insight_daily
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON insight_hourly
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON alerts
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON recommendations
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON campaign_scores
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_select" ON sync_log
  FOR SELECT USING (tenant_id = current_tenant_id());

-- rule_config: pode ver global (tenant_id IS NULL) ou do próprio tenant
CREATE POLICY "tenant_select" ON rule_config
  FOR SELECT USING (tenant_id IS NULL OR tenant_id = current_tenant_id());

-- ============================================================
-- Policies: UPDATE para alertas (marcar como lido/dismissado)
-- ============================================================
CREATE POLICY "tenant_update_alerts" ON alerts
  FOR UPDATE USING (tenant_id = current_tenant_id());

CREATE POLICY "tenant_update_recommendations" ON recommendations
  FOR UPDATE USING (tenant_id = current_tenant_id());
