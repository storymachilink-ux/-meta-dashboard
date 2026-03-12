import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { dailyAdsData } from '../dailyAdsData.js';
import { fmtBRL, fmtPct } from '../utils.js';

function analyzeAd(ad, dailyRecords, days) {
  const insights = [];
  const recent = dailyRecords.filter(d => d.ad_id === ad.ad_id).sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length < 2) return insights;

  const last = recent.slice(-days);
  const totalSpend = last.reduce((s, d) => s + d.spend, 0);
  const totalClicks = last.reduce((s, d) => s + d.clicks, 0);
  const totalPurchases = last.reduce((s, d) => s + d.purchases, 0);
  const avgCTR = last.reduce((s, d) => s + d.ctr, 0) / last.length;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPP = totalPurchases > 0 ? totalSpend / totalPurchases : null;

  // Consecutive good days (purchases > 0 and CTR >= 1.5)
  let goodStreak = 0;
  let badStreak = 0;
  let noSalesStreak = 0;

  for (let i = recent.length - 1; i >= 0; i--) {
    const d = recent[i];
    if (d.purchases > 0 || (d.ctr >= 1.5 && d.spend > 0)) goodStreak++;
    else break;
  }
  for (let i = recent.length - 1; i >= 0; i--) {
    const d = recent[i];
    if (d.ctr < 0.5 && d.spend > 0) badStreak++;
    else break;
  }
  for (let i = recent.length - 1; i >= 0; i--) {
    const d = recent[i];
    if (d.spend > 0 && d.purchases === 0) noSalesStreak++;
    else break;
  }

  // CPP trend
  const halfIdx = Math.floor(last.length / 2);
  const firstHalf = last.slice(0, halfIdx);
  const secondHalf = last.slice(halfIdx);
  const cpp1 = firstHalf.reduce((s, d) => s + (d.cpp || 0), 0) / (firstHalf.filter(d => d.cpp).length || 1);
  const cpp2 = secondHalf.reduce((s, d) => s + (d.cpp || 0), 0) / (secondHalf.filter(d => d.cpp).length || 1);
  const cppImproving = cpp1 > 0 && cpp2 > 0 && cpp2 < cpp1 * 0.85;
  const cppDegrading = cpp1 > 0 && cpp2 > 0 && cpp2 > cpp1 * 1.3;

  // CTR trend
  const ctr1 = firstHalf.reduce((s, d) => s + d.ctr, 0) / (firstHalf.length || 1);
  const ctr2 = secondHalf.reduce((s, d) => s + d.ctr, 0) / (secondHalf.length || 1);
  const ctrDrop = ctr1 > 1 && ctr2 < ctr1 * 0.7;
  const ctrRising = ctr2 > ctr1 * 1.3 && ctr2 >= 1.5;

  // GOOD: consistent sales streak
  if (goodStreak >= 3 && totalPurchases > 0) {
    insights.push({
      type: 'success',
      icon: '🚀',
      title: `Bom desempenho há ${goodStreak} dias consecutivos!`,
      text: `"${ad.ad_name}" está gerando ${totalPurchases} conversão(ões) com CPA de ${avgCPP ? fmtBRL(avgCPP) : '—'}. Considere aumentar o orçamento em 20–30% para ampliar o alcance sem perder eficiência.`,
      action: 'Escalar Orçamento',
      priority: 'high',
    });
  }

  // GOOD: CPA improving
  if (cppImproving && avgCPP) {
    insights.push({
      type: 'success',
      icon: '📉',
      title: 'CPA em queda (melhora)',
      text: `O CPA de "${ad.ad_name}" caiu ${Math.round((1 - cpp2/cpp1)*100)}% na segunda metade do período (${fmtBRL(cpp1)} → ${fmtBRL(cpp2)}). O algoritmo está otimizando bem. Mantenha o orçamento estável por mais ${Math.max(2, 5 - goodStreak)} dias.`,
      action: 'Manter e Monitorar',
      priority: 'medium',
    });
  }

  // BAD: CTR dropping fast
  if (ctrDrop) {
    insights.push({
      type: 'warning',
      icon: '📉',
      title: 'CTR caindo — sinal de fadiga criativa',
      text: `"${ad.ad_name}" perdeu ${Math.round((1 - ctr2/ctr1)*100)}% do CTR na última metade do período (${ctr1.toFixed(2)}% → ${ctr2.toFixed(2)}%). O público está se saturando com este criativo. Crie variações ou substitua o criativo.`,
      action: 'Criar Variação do Criativo',
      priority: 'high',
    });
  }

  // BAD: no sales in consecutive days with spend
  if (noSalesStreak >= 4 && totalSpend > 30) {
    insights.push({
      type: 'danger',
      icon: '🛑',
      title: `${noSalesStreak} dias sem conversão com gasto acumulado`,
      text: `"${ad.ad_name}" gastou ${fmtBRL(totalSpend)} nos últimos ${days} dias sem registrar compras. Verifique o pixel de conversão, a página de destino e o copy da oferta. Se o problema persistir, pause este anúncio.`,
      action: 'Pausar Anúncio',
      priority: 'critical',
    });
  }

  // BAD: CPA degrading
  if (cppDegrading && avgCPP) {
    insights.push({
      type: 'danger',
      icon: '📈',
      title: 'CPA subindo — eficiência caindo',
      text: `O CPA de "${ad.ad_name}" aumentou ${Math.round((cpp2/cpp1 - 1)*100)}% na segunda metade (${fmtBRL(cpp1)} → ${fmtBRL(cpp2)}). O criativo está perdendo força. Tente um novo ângulo de copy ou segmentação diferente.`,
      action: 'Revisar Copy/Segmentação',
      priority: 'high',
    });
  }

  // GOOD: CTR rising
  if (ctrRising) {
    insights.push({
      type: 'success',
      icon: '📈',
      title: 'CTR em ascensão',
      text: `"${ad.ad_name}" está com CTR crescendo (${ctr1.toFixed(2)}% → ${ctr2.toFixed(2)}%). O criativo está ressoando bem com o público. Bom momento para aumentar orçamento ou duplicar o conjunto de anúncios.`,
      action: 'Duplicar e Escalar',
      priority: 'medium',
    });
  }

  // Low CTR bad streak
  if (badStreak >= 5 && totalSpend > 15) {
    insights.push({
      type: 'danger',
      icon: '⚠️',
      title: `CTR abaixo de 0.5% por ${badStreak} dias`,
      text: `"${ad.ad_name}" tem CTR médio de ${avgCTR.toFixed(2)}% nos últimos ${badStreak} dias, com ${fmtBRL(totalSpend)} investido. CTR muito baixo indica desalinhamento entre criativo e público. Pause e teste um novo ângulo.`,
      action: 'Pausar e Testar Novo Criativo',
      priority: 'critical',
    });
  }

  return insights;
}

function analyzeCampaign(campaign, dailyCampaignData, days) {
  const insights = [];
  const recent = dailyCampaignData.filter(d => d.campaign_id === campaign.id).sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  if (recent.length < 2) return insights;

  const totalSpend = recent.reduce((s, d) => s + d.spend, 0);
  const totalClicks = recent.reduce((s, d) => s + d.clicks, 0);
  const avgCTR = recent.reduce((s, d) => s + d.ctr, 0) / recent.length;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const freqEstimate = campaign.frequency;

  // High frequency + low CTR = bad
  if (freqEstimate > 3 && avgCTR < 1) {
    insights.push({
      type: 'danger',
      icon: '🔁',
      title: `Frequência alta (${freqEstimate.toFixed(1)}x) + CTR baixo`,
      text: `A campanha "${campaign.name}" está mostrando o mesmo anúncio muitas vezes para as mesmas pessoas, mas com baixo CTR. O público esgotou o interesse. Expanda o público, renove o criativo ou crie uma Lookalike com base nos compradores.`,
      action: 'Expandir Público ou Renovar Criativo',
      priority: 'high',
    });
  }

  // Consistent good performance
  const goodDays = recent.filter(d => d.ctr >= 1.5 && d.spend > 0).length;
  if (goodDays >= days * 0.7 && totalSpend > 20) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: `Campanha estável — ${goodDays}/${recent.length} dias com bom CTR`,
      text: `"${campaign.name}" mantém CTR médio de ${avgCTR.toFixed(2)}% com CPC de ${fmtBRL(avgCPC)}. Campanha saudável. Bom momento para aumentar o orçamento diário em até 20%.`,
      action: 'Aumentar Orçamento',
      priority: 'medium',
    });
  }

  return insights;
}

export default function SmartAnalysis() {
  const { filteredCampaigns, filteredDaily, days } = useApp();
  const [loading, setLoading] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedDays, setSelectedDays] = useState(days);
  const ANALYSIS_PILLS = [3, 7, 15, 30];

  const runAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      const { adInsights, campaignInsights, summary } = buildAnalysis(selectedDays);
      setAnalysisData({ adInsights, campaignInsights, summary, days: selectedDays, ts: new Date().toLocaleString('pt-BR') });
      setAnalysisReady(true);
      setLoading(false);
    }, 800);
  };

  const buildAnalysis = (d) => {
    const cutoff = new Date('2026-03-08');
    cutoff.setDate(cutoff.getDate() - d);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Group ads by ad_id
    const adMap = {};
    dailyAdsData.forEach(rec => {
      if (rec.date < cutoffStr) return;
      if (!adMap[rec.ad_id]) adMap[rec.ad_id] = { ad_id: rec.ad_id, ad_name: rec.ad_name, adset_name: rec.adset_name, campaign_name: rec.campaign_name };
    });

    const adInsights = [];
    Object.values(adMap).forEach(ad => {
      const ins = analyzeAd(ad, dailyAdsData, d);
      if (ins.length) adInsights.push(...ins.map(i => ({ ...i, adName: ad.ad_name, adsetName: ad.adset_name, campaignName: ad.campaign_name })));
    });

    const campaignInsights = [];
    filteredCampaigns.filter(c => c.spend > 10).forEach(camp => {
      const ins = analyzeCampaign(camp, filteredDaily, d);
      if (ins.length) campaignInsights.push(...ins.map(i => ({ ...i, campaignName: camp.name, account: camp.account })));
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    adInsights.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    campaignInsights.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    const critical = [...adInsights, ...campaignInsights].filter(x => x.priority === 'critical').length;
    const positives = [...adInsights, ...campaignInsights].filter(x => x.type === 'success').length;
    const warnings = [...adInsights, ...campaignInsights].filter(x => x.type === 'warning' || x.type === 'danger').length;

    return { adInsights, campaignInsights, summary: { critical, positives, warnings } };
  };

  const typeColors = { success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#dcfce7' }, warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#fef9c3' }, danger: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badge: '#ffedd5' }, info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe' } };
  const priorityLabel = { critical: { label: 'Crítico', color: '#ef4444' }, high: { label: 'Alta', color: '#f97316' }, medium: { label: 'Média', color: '#f59e0b' } };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧠</span> Análise Inteligente com base nos dados
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
            Detecta padrões reais de dias consecutivos nos seus criativos e campanhas
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Period pills inline */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {ANALYSIS_PILLS.map(d => (
              <button key={d} onClick={() => setSelectedDays(d)}
                style={{ padding: '5px 12px', borderRadius: '999px', border: '1.5px solid', borderColor: selectedDays === d ? '#6366f1' : '#e2e8f0', background: selectedDays === d ? '#6366f1' : 'white', color: selectedDays === d ? 'white' : '#64748b', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={runAnalysis} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', borderRadius: '10px', border: 'none', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}>
            {loading ? <><Spinner /> Analisando...</> : <><span>⚡</span> Gerar Análise</>}
          </button>
        </div>
      </div>

      {/* Not yet run */}
      {!analysisReady && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Clique em "Gerar Análise" para ver diagnósticos baseados em dados reais</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Analisa padrões de dias consecutivos em criativos e campanhas</div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>⚙️</div>
          <div style={{ fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>Lendo padrões de {selectedDays} dias de dados...</div>
        </div>
      )}

      {analysisReady && analysisData && (
        <div>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <SummaryChip icon="🚨" label="Crítico" value={analysisData.summary.critical} color="#ef4444" />
            <SummaryChip icon="⚠️" label="Alertas" value={analysisData.summary.warnings} color="#f97316" />
            <SummaryChip icon="✅" label="Pontos positivos" value={analysisData.summary.positives} color="#10b981" />
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>
              Análise de {analysisData.days} dias · {analysisData.ts}
            </div>
          </div>

          {/* Ad insights */}
          {analysisData.adInsights.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📣 Criativos / Anúncios ({analysisData.adInsights.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
                {analysisData.adInsights.map((ins, i) => (
                  <InsightCard key={i} ins={ins} typeColors={typeColors} priorityLabel={priorityLabel} />
                ))}
              </div>
            </div>
          )}

          {/* Campaign insights */}
          {analysisData.campaignInsights.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📋 Campanhas ({analysisData.campaignInsights.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
                {analysisData.campaignInsights.map((ins, i) => (
                  <InsightCard key={i} ins={ins} typeColors={typeColors} priorityLabel={priorityLabel} />
                ))}
              </div>
            </div>
          )}

          {analysisData.adInsights.length === 0 && analysisData.campaignInsights.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
              Sem padrões detectáveis neste período. Tente ampliar a janela de dias.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ ins, typeColors, priorityLabel }) {
  const tc = typeColors[ins.type] || typeColors.info;
  const pl = priorityLabel[ins.priority] || {};
  return (
    <div style={{ padding: '14px', borderRadius: '12px', background: tc.bg, border: '1px solid ' + tc.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
          <span style={{ fontSize: '16px' }}>{ins.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: tc.text, lineHeight: 1.3 }}>{ins.title}</span>
        </div>
        {pl.label && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: pl.color, background: pl.color + '18', padding: '2px 7px', borderRadius: '999px', flexShrink: 0, marginLeft: '6px' }}>
            {pl.label}
          </span>
        )}
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {ins.campaignName && <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>{ins.campaignName?.slice(0, 30)}</span>}
        {ins.adsetName && <><span>›</span><span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>{ins.adsetName?.slice(0, 25)}</span></>}
      </div>

      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.6 }}>{ins.text}</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: tc.text, background: tc.badge, padding: '4px 12px', borderRadius: '8px', border: '1px solid ' + tc.border }}>
          → {ins.action}
        </span>
      </div>
    </div>
  );
}

function SummaryChip({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '10px', background: color + '10', border: '1px solid ' + color + '30' }}>
      <span>{icon}</span>
      <span style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
    </div>
  );
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
