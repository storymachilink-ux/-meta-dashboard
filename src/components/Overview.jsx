import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import { fmtBRL, fmtInt, fmtPct, fmt, scoreColor } from '../utils.js';
import { AreaChart, Area, BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import PeriodPills from './PeriodPills.jsx';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ── Utility: build array of hours within a time window (handles overnight) ──
function buildHourRange(start, end) {
  const s = parseInt(start, 10), e = parseInt(end, 10);
  if (e >= s) return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  return [...Array.from({ length: 24 - s }, (_, i) => s + i), ...Array.from({ length: e + 1 }, (_, i) => i)];
}

function last7Dates() {
  const dates = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function Overview({ onSelectCampaign }) {
  const { t, summary, filteredCampaigns, filteredDaily, days, periodMetrics,
    scaleRecs, pauseRecs, testRecs, recsLoading,
    timeWindows, campaignBudgets } = useApp();

  const { totalSpend, totalImpressions, totalClicks, avgCTR, avgCPC, avgCPM,
    totalPurchases, totalRevenue, avgROAS, totalReach, totalEngagement } = summary;

  const totalLucro = totalRevenue - totalSpend;

  const spendByDay = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => { map[d.date] = (map[d.date] || 0) + d.spend; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, v }));
  }, [filteredDaily]);

  const clicksByDay = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => { map[d.date] = (map[d.date] || 0) + d.clicks; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, v }));
  }, [filteredDaily]);

  const metrics = [
    { key: 'totalSpend',   value: fmtBRL(totalSpend),          color: '#6366f1', spark: spendByDay,  icon: '💰' },
    { key: 'impressions',  value: fmtInt(totalImpressions),     color: '#8b5cf6', spark: [],          icon: '👁' },
    { key: 'clicks',       value: fmtInt(totalClicks),          color: '#0ea5e9', spark: clicksByDay, icon: '🖱' },
    { key: 'ctr',          value: fmtPct(avgCTR),               color: avgCTR >= 2 ? '#10b981' : avgCTR >= 1 ? '#f59e0b' : '#ef4444', spark: [], icon: '📊' },
    { key: 'cpc',          value: fmtBRL(avgCPC),               color: avgCPC < 1.5 ? '#10b981' : avgCPC < 3 ? '#f59e0b' : '#ef4444', spark: [], icon: '🏷' },
    { key: 'cpm',          value: fmtBRL(avgCPM),               color: '#06b6d4', spark: [],          icon: '📡' },
    { key: 'purchases',    value: fmtInt(totalPurchases),       color: '#10b981', spark: [],          icon: '🛒' },
    { key: 'roas',         value: fmt(avgROAS) + 'x',           color: avgROAS >= 3 ? '#10b981' : avgROAS >= 1.5 ? '#f59e0b' : '#ef4444', spark: [], icon: '📈' },
    { key: 'lucro',        value: fmtBRL(totalLucro),           color: totalLucro >= 0 ? '#10b981' : '#ef4444', spark: [], icon: '💵', label: 'Lucro' },
    { key: 'reach',        value: fmtInt(totalReach),           color: '#a78bfa', spark: [],          icon: '🎯' },
  ];

  const topSpend = useMemo(() => [...filteredCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 5), [filteredCampaigns]);
  const bestCTR  = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200).sort((a, b) => b.ctr - a.ctr).slice(0, 5), [filteredCampaigns]);
  const worstCTR = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200 && c.ctr > 0).sort((a, b) => a.ctr - b.ctr).slice(0, 5), [filteredCampaigns]);
  const highFreq = useMemo(() => filteredCampaigns.filter(c => c.frequency > 2).sort((a, b) => b.frequency - a.frequency).slice(0, 5), [filteredCampaigns]);

  const periodLabel = days <= 3 ? `${days} dias` : days === 7 ? '7 dias' : days === 15 ? '15 dias' : days === 30 ? 'mês' : `${days} dias`;

  // Melhores dias por dia da semana
  const bestDaysByWeekday = useMemo(() => {
    const map = {}; // weekday 0-6 → {spend, revenue, purchases, days}
    filteredDaily.forEach(d => {
      const wd = new Date(d.date + 'T12:00:00').getDay();
      if (!map[wd]) map[wd] = { spend: 0, revenue: 0, purchases: 0, days: 0 };
      map[wd].spend    += d.spend    || 0;
      map[wd].revenue  += d.revenue  || 0;
      map[wd].purchases+= d.purchases|| 0;
      map[wd].days++;
    });
    return DAY_NAMES.map((name, wd) => {
      const m = map[wd] || { spend: 0, revenue: 0, purchases: 0, days: 0 };
      const roas  = m.spend > 0 ? m.revenue / m.spend : 0;
      const avgSpend = m.days > 0 ? m.spend / m.days : 0;
      return { name, wd, roas, avgSpend, purchases: m.purchases, revenue: m.revenue, spend: m.spend, days: m.days };
    });
  }, [filteredDaily]);

  // Melhores dias por data (últimos 7 dias com spend)
  const last7DaysPerf = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      if (!map[d.date]) map[d.date] = { spend: 0, revenue: 0, purchases: 0 };
      map[d.date].spend     += d.spend    || 0;
      map[d.date].revenue   += d.revenue  || 0;
      map[d.date].purchases += d.purchases|| 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([date, m]) => ({
        date: date.slice(5), // MM-DD
        roas: m.spend > 0 ? m.revenue / m.spend : 0,
        spend: m.spend, revenue: m.revenue, purchases: m.purchases,
      }))
      .reverse();
  }, [filteredDaily]);

  const priorities = useMemo(() => {
    const byCampaign = {};
    filteredDaily.forEach(d => {
      if (!byCampaign[d.campaign_id]) byCampaign[d.campaign_id] = [];
      byCampaign[d.campaign_id].push(d);
    });
    const alerts = [];
    Object.entries(byCampaign).forEach(([id, dailyRows]) => {
      const camp = filteredCampaigns.find(c => c.id === id);
      if (!camp) return;
      const totalSpend = dailyRows.reduce((s, d) => s + d.spend, 0);
      const totalPurchases = dailyRows.reduce((s, d) => s + d.purchases, 0);
      const totalImpressions = dailyRows.reduce((s, d) => s + d.impressions, 0);
      const totalClicks = dailyRows.reduce((s, d) => s + d.clicks, 0);
      const periodCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      if (totalSpend < 10 && totalImpressions < 300) return;
      const reasons = [];
      if (camp.objective?.includes('SALES') && totalPurchases === 0 && totalSpend > 30)
        reasons.push({ type: 'danger', icon: '❌', text: `Sem conversões nos últimos ${periodLabel}: ${fmtBRL(totalSpend)} gastos sem retorno` });
      if (periodCTR < 0.5 && totalSpend > 20 && totalImpressions > 500)
        reasons.push({ type: 'danger', icon: '📉', text: `CTR de ${fmtPct(periodCTR)} — criativo não está engajando` });
      if (camp.frequency > 3.5)
        reasons.push({ type: 'danger', icon: '🔁', text: `Frequência ${camp.frequency.toFixed(1)}x — público saturado, renovar criativo` });
      const sorted = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length >= 6) {
        const mid = Math.floor(sorted.length / 2);
        const h1 = sorted.slice(0, mid), h2 = sorted.slice(mid);
        const imp1 = h1.reduce((s, d) => s + d.impressions, 0);
        const imp2 = h2.reduce((s, d) => s + d.impressions, 0);
        const ctr1 = imp1 > 0 ? (h1.reduce((s, d) => s + d.clicks, 0) / imp1) * 100 : 0;
        const ctr2 = imp2 > 0 ? (h2.reduce((s, d) => s + d.clicks, 0) / imp2) * 100 : 0;
        if (ctr1 > 0.5 && ctr2 < ctr1 * 0.55 && ctr2 < 1)
          reasons.push({ type: 'warning', icon: '⚠️', text: `CTR caindo: ${fmtPct(ctr1)} → ${fmtPct(ctr2)} na segunda metade do período` });
      }
      if (reasons.length > 0) alerts.push({ c: camp, recs: reasons, spend: totalSpend });
    });
    filteredCampaigns.forEach(c => {
      if (byCampaign[c.id] || c.spend < 10) return;
      const reasons = [];
      if (c.frequency > 3.5) reasons.push({ type: 'danger', icon: '🔁', text: `Frequência muito alta ${c.frequency.toFixed(1)}x — renovar criativos` });
      if (c.ctr < 0.5 && c.spend > 30 && c.impressions > 500) reasons.push({ type: 'danger', icon: '📉', text: `CTR crítico ${fmtPct(c.ctr)} — criativo sem performance` });
      if (reasons.length > 0) alerts.push({ c, recs: reasons, spend: c.spend });
    });
    return alerts.sort((a, b) => b.spend - a.spend).slice(0, 8);
  }, [filteredCampaigns, filteredDaily, days]);

  // ── Hourly window analysis ─────────────────────────────────────────────
  const [hourlyByDate, setHourlyByDate] = useState({});
  const [hwLoading, setHwLoading]       = useState(true);
  const [hwHasData, setHwHasData]       = useState(false);
  const [syncingHourly, setSyncingHourly] = useState(false);

  useEffect(() => {
    const dates = last7Dates();
    Promise.all(dates.map(d =>
      fetch(`/api/hourly?date=${d}&level=campaign`)
        .then(r => r.ok ? r.json() : {})
        .catch(() => ({}))
    )).then(results => {
      const byDate = {};
      results.forEach((r, i) => { if (r.raw?.length) byDate[dates[i]] = r; });
      setHourlyByDate(byDate);
      setHwHasData(Object.keys(byDate).length > 0);
      setHwLoading(false);
    });
  }, []);

  const windowData = useMemo(() => {
    if (!hwHasData || !timeWindows?.length) return [];
    return timeWindows.map(w => {
      const hours = buildHourRange(w.start, w.end);
      let spend = 0, revenue = 0, purchases = 0;
      const campMap = {};
      Object.values(hourlyByDate).forEach(day => {
        (day.raw || []).forEach(row => {
          if (!hours.includes(row.hour)) return;
          spend     += row.spend         || 0;
          revenue   += row.purchase_value|| 0;
          purchases += row.purchases     || 0;
          if (!campMap[row.entity_id])
            campMap[row.entity_id] = { name: row.entity_name, spend: 0, revenue: 0, purchases: 0 };
          campMap[row.entity_id].spend     += row.spend          || 0;
          campMap[row.entity_id].revenue   += row.purchase_value || 0;
          campMap[row.entity_id].purchases += row.purchases      || 0;
        });
      });
      const roas = spend > 0 ? revenue / spend : 0;
      const campaigns = Object.entries(campMap).map(([id, m]) => ({
        id, ...m,
        roas: m.spend > 0 ? m.revenue / m.spend : 0,
        budgetInfo: campaignBudgets[id] || null,
      })).sort((a, b) => b.spend - a.spend);
      return { window: w, spend, revenue, purchases, roas, campaigns, daysWithData: Object.keys(hourlyByDate).length };
    });
  }, [hwHasData, hourlyByDate, timeWindows, campaignBudgets]);

  const accountBreakdown = useMemo(() => {
    const map = {};
    filteredCampaigns.forEach(c => {
      if (!map[c.account]) map[c.account] = { name: c.account, spend: 0, impressions: 0, clicks: 0, count: 0 };
      map[c.account].spend += c.spend;
      map[c.account].impressions += c.impressions;
      map[c.account].clicks += c.clicks;
      map[c.account].count++;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [filteredCampaigns]);
  const maxSpend = Math.max(...accountBreakdown.map(a => a.spend), 1);

  return (
    <div>
      <div style={{ marginBottom: 18 }}><PeriodPills /></div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
        {metrics.map(m => (
          <MetricCard key={m.key} label={m.label || t.metrics[m.key]} value={m.value} color={m.color} icon={m.icon} sparkData={m.spark} />
        ))}
      </div>

      {/* Account breakdown + Sales snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <SectionTitle>{t.byAccount}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {accountBreakdown.map(a => (
              <div key={a.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{a.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmtBRL(a.spend)} · {a.count} camp.</span>
                </div>
                <div style={{ background: 'var(--border-subtle)', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', width: (a.spend / maxSpend * 100) + '%', transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3 }}>{fmtInt(a.impressions)} imp. · {fmtInt(a.clicks)} cliques</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <SectionTitle>💰 {t.metrics.roas} & {t.metrics.revenue}</SectionTitle>
          {filteredCampaigns.filter(c => c.objective?.includes('SALES') && c.spend > 5).sort((a, b) => b.roas - a.roas).slice(0, 6).map(c => (
            <div key={c.id} onClick={() => onSelectCampaign(c)} className="hover-bg"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background var(--t-fast)' }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Chip val={fmtBRL(c.spend)} color="#6366f1" />
                {(c.revenue || 0) > 0 && (() => { const l = (c.revenue||0) - c.spend; return <Chip val={(l >= 0 ? '+' : '') + fmtBRL(l)} color={l >= 0 ? '#10b981' : '#ef4444'} />; })()}
                <Chip val={c.roas > 0 ? c.roas.toFixed(2) + 'x' : '—'} color={c.roas >= 3 ? '#10b981' : c.roas >= 1.5 ? '#f59e0b' : '#ef4444'} />
              </div>
            </div>
          ))}
          {filteredCampaigns.filter(c => c.objective?.includes('SALES') && c.spend > 5).length === 0 && (
            <EmptyState text={t.noData} />
          )}
        </div>
      </div>

      {/* 4 ranking cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <RankCard title={`💸 ${t.topSpend}`}  items={topSpend}  field="spend"     fmt={fmtBRL}                         onSelect={onSelectCampaign} />
        <RankCard title={`🎯 ${t.bestCTR}`}   items={bestCTR}   field="ctr"       fmt={(v) => v.toFixed(2) + '%'}      onSelect={onSelectCampaign} positive />
        <RankCard title={`⚠️ ${t.worstCTR}`}  items={worstCTR}  field="ctr"       fmt={(v) => v.toFixed(2) + '%'}      onSelect={onSelectCampaign} negative />
        <RankCard title={`🔁 ${t.highFreq}`}  items={highFreq}  field="frequency" fmt={(v) => v.toFixed(2) + 'x'}      onSelect={onSelectCampaign} negative />
      </div>

      {/* Melhores Dias */}
      {filteredDaily.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Por dia da semana */}
          <div style={card}>
            <SectionTitle>📅 Performance por Dia da Semana</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...bestDaysByWeekday].sort((a, b) => b.roas - a.roas).map((d, i) => {
                const maxRoas = Math.max(...bestDaysByWeekday.map(x => x.roas), 0.01);
                const pct = Math.round((d.roas / maxRoas) * 100);
                const col = d.roas >= 3 ? '#10b981' : d.roas >= 1.5 ? '#f59e0b' : d.days === 0 ? '#94a3b8' : '#ef4444';
                return (
                  <div key={d.wd} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', width: 26, flexShrink: 0 }}>{d.name}</span>
                    <div style={{ flex: 1, background: 'var(--border-subtle)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: 99, transition: 'width 0.6s' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: col, width: 40, textAlign: 'right', flexShrink: 0 }}>
                      {d.days === 0 ? '—' : d.roas.toFixed(1) + 'x'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: 50, textAlign: 'right', flexShrink: 0 }}>
                      {d.purchases > 0 ? `${d.purchases} vnd` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimos 7 dias */}
          <div style={card}>
            <SectionTitle>📊 Últimos 7 Dias</SectionTitle>
            {last7DaysPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={last7DaysPerf} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v, name) => name === 'roas' ? [v.toFixed(2) + 'x', 'ROAS'] : [fmtBRL(v), 'Gasto']}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <Bar dataKey="roas" radius={[4, 4, 0, 0]}>
                    {last7DaysPerf.map((d, i) => (
                      <Cell key={i} fill={d.roas >= 3 ? '#10b981' : d.roas >= 1.5 ? '#f59e0b' : d.roas > 0 ? '#ef4444' : '#94a3b855'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Dados insuficientes para o período" />
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {last7DaysPerf.slice(-7).sort((a, b) => b.roas - a.roas).slice(0, 3).map((d, i) => (
                <span key={i} style={{ fontSize: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px', color: 'var(--text-muted)' }}>
                  {['🥇','🥈','🥉'][i]} {d.date} · {d.roas.toFixed(1)}x
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decision Panel — DB recs or computed priorities */}
      {(scaleRecs?.length > 0 || pauseRecs?.length > 0 || testRecs?.length > 0) ? (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div className="decision-band" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="live-dot" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>Painel de Decisão</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                · {(scaleRecs?.length || 0) + (pauseRecs?.length || 0) + (testRecs?.length || 0)} ações · últimos {periodLabel}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#818cf8', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.28)', borderRadius: 999, padding: '3px 10px', fontWeight: 700, letterSpacing: '0.02em' }}>
              ✦ IA · Banco de dados
            </span>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <DecisionCol icon="🚀" label="Escalar" color="#10b981" bg="var(--success-soft)" border="var(--success)" recs={scaleRecs} campaigns={filteredCampaigns} onSelect={onSelectCampaign} />
            <DecisionCol icon="⏸" label="Pausar" color="var(--danger)" bg="var(--danger-soft)" border="var(--danger)" recs={pauseRecs} campaigns={filteredCampaigns} onSelect={onSelectCampaign} />
            <DecisionCol icon="🔬" label="Testar Criativo" color="var(--warning)" bg="var(--warning-soft)" border="var(--warning)" recs={testRecs} campaigns={filteredCampaigns} onSelect={onSelectCampaign} />
          </div>
        </div>
      ) : priorities.length > 0 ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>🚨 {t.priorities}</div>
            <span style={{ fontSize: '11px', color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
              Últimos {periodLabel}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {priorities.map(({ c, recs, spend }) => (
              <div key={c.id} onClick={() => onSelectCampaign(c)}
                style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', cursor: 'pointer', transition: 'all var(--t-fast)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{c.name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtBRL(spend || c.spend)}</span>
                    {(c.revenue || 0) > 0 && (() => { const l = (c.revenue||0) - (spend||c.spend); return <span style={{ fontSize: '10px', fontWeight: 700, color: l >= 0 ? '#10b981' : '#ef4444' }}>{l >= 0 ? '+' : ''}{fmtBRL(l)} lucro</span>; })()}
                  </div>
                </div>
                {recs.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ fontSize: '11.5px', color: r.type === 'danger' ? 'var(--danger)' : 'var(--warning)', display: 'flex', gap: 5, marginTop: 4, lineHeight: 1.45 }}>
                    <span style={{ flexShrink: 0 }}>{r.icon}</span><span>{r.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Time Window Analysis ─────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>⏰ Análise por Janela de Horário</div>
          {hwHasData && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px', fontWeight: 600 }}>
              {Object.keys(hourlyByDate).length} dias disponíveis
            </span>
          )}
        </div>

        {hwLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ ...card, height: 130, background: 'var(--bg-subtle)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : !hwHasData ? (
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Dados horários não disponíveis</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Sincronize os dados horários para ver métricas por faixa de horário — Manhã, Tarde, Noite e Madrugada.
            </div>
            <button
              disabled={syncingHourly}
              onClick={async () => {
                setSyncingHourly(true);
                try { await fetch('/api/sync/hourly', { method: 'POST' }); } catch {}
                setTimeout(() => { setSyncingHourly(false); window.location.reload(); }, 4000);
              }}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: syncingHourly ? 'wait' : 'pointer', opacity: syncingHourly ? 0.7 : 1 }}
            >
              {syncingHourly ? '🔄 Sincronizando...' : '🔄 Sincronizar Dados Horários'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {windowData.map(data => (
              <WindowCard key={data.window.id} data={data} onSelectCampaign={onSelectCampaign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MetricCard({ label, value, color, icon, sparkData }) {
  return (
    <div className="hover-card" style={{ ...card, position: 'relative', overflow: 'hidden', padding: '18px 20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '1a', border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.8px' }}>{value}</div>
      {sparkData && sparkData.length > 3 && (
        <div style={{ marginTop: 10, height: 36 }}>
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
    </div>
  );
}

function RankCard({ title, items, field, fmt: fmtFn, onSelect, positive, negative }) {
  const max = Math.max(...items.map(c => c[field] || 0), 0.01);
  const valueColor = negative ? 'var(--danger)' : positive ? 'var(--success)' : 'var(--accent)';
  return (
    <div style={card}>
      <div className="section-header">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((c, i) => (
          <div key={c.id} onClick={() => onSelect(c)} className="hover-bg"
            style={{ padding: '8px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background var(--t-fast)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '10px', color: 'var(--text-disabled)', fontWeight: 800, width: 14, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {field === 'spend' && (c.revenue || 0) > 0 && (() => { const l = (c.revenue||0) - c.spend; return <span style={{ fontSize: '10px', fontWeight: 700, color: l >= 0 ? '#10b981' : '#ef4444', flexShrink: 0 }}>{l >= 0 ? '+' : ''}{fmtBRL(l)}</span>; })()}
              <span style={{ fontSize: '12px', fontWeight: 800, color: valueColor, flexShrink: 0 }}>{fmtFn(c[field])}</span>
            </div>
            <div style={{ marginLeft: 22, height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: valueColor, width: ((c[field] || 0) / max * 100) + '%', opacity: 0.5, transition: 'width 0.6s' }} />
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyState text="—" />}
      </div>
    </div>
  );
}

function Chip({ val, color }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color, background: color + '18', padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}25` }}>{val}</span>
  );
}

function EmptyState({ text }) {
  return <div style={{ fontSize: '12px', color: 'var(--text-disabled)', textAlign: 'center', padding: '16px 0' }}>{text}</div>;
}

function SectionTitle({ children }) {
  return <div className="section-header">{children}</div>;
}

function DecisionCol({ icon, label, color, bg, border, recs, campaigns, onSelect }) {
  if (!recs?.length) return (
    <div style={{ borderRadius: 'var(--r-md)', border: `1.5px dashed ${border}45`, padding: '20px 16px', opacity: 0.5, textAlign: 'center', background: bg }}>
      <div style={{ fontSize: '24px', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '12px', fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: 4 }}>Nenhuma agora</div>
    </div>
  );
  return (
    <div style={{ borderRadius: 'var(--r-md)', border: `1px solid ${border}`, background: bg, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${border}45` }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color, letterSpacing: '-0.1px' }}>{label}</span>
        <span style={{ marginLeft: 'auto', background: color, color: 'white', fontSize: '10px', fontWeight: 800, borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{recs.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recs.slice(0, 4).map((r, i) => {
          const camp = campaigns.find(c => c.id === r.entity_id || c.name === r.entity_name);
          return (
            <div key={i} onClick={() => camp && onSelect(camp)}
              style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px', cursor: camp ? 'pointer' : 'default', transition: 'all var(--t-fast)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { if (camp) { e.currentTarget.style.borderColor = border; e.currentTarget.style.boxShadow = `0 2px 10px ${border}28`; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
                {r.entity_name || '—'}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: (r.message || r.reason) ? 5 : 0 }}>
                {camp && camp.spend > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color, background: color + '15', padding: '1px 7px', borderRadius: 99 }}>{fmtBRL(camp.spend)}</span>
                )}
                {camp && camp.purchases > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', background: '#10b98115', padding: '1px 7px', borderRadius: 99 }}>
                    {camp.purchases} vendas
                  </span>
                )}
                {camp && camp.roas > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: camp.roas >= 3 ? '#10b981' : camp.roas >= 1.5 ? '#f59e0b' : '#ef4444', background: (camp.roas >= 3 ? '#10b981' : camp.roas >= 1.5 ? '#f59e0b' : '#ef4444') + '15', padding: '1px 7px', borderRadius: 99 }}>
                    {camp.roas.toFixed(1)}x ROAS
                  </span>
                )}
                {camp && camp.spend > 0 && (camp.revenue || 0) > 0 && (() => {
                  const lucro = (camp.revenue || 0) - camp.spend;
                  const lc = lucro >= 0 ? '#10b981' : '#ef4444';
                  return <span style={{ fontSize: '10px', fontWeight: 700, color: lc, background: lc + '15', padding: '1px 7px', borderRadius: 99 }}>
                    {lucro >= 0 ? '+' : ''}{fmtBRL(lucro)} lucro
                  </span>;
                })()}
              </div>
              {(r.message || r.reason) && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.message || r.reason}</div>
              )}
            </div>
          );
        })}
        {recs.length > 4 && (
          <div style={{ fontSize: '11px', color, textAlign: 'center', fontWeight: 700, padding: '4px 0', background: color + '0d', borderRadius: 'var(--r-sm)' }}>
            +{recs.length - 4} campanhas
          </div>
        )}
      </div>
    </div>
  );
}

// ── Budget badge ──────────────────────────────────────────────────────────────
function BudgetBadge({ type }) {
  const isCBO = type === 'CBO';
  return (
    <span style={{
      fontSize: 10, fontWeight: 800,
      color: isCBO ? '#6366f1' : '#0ea5e9',
      background: isCBO ? 'rgba(99,102,241,0.1)' : 'rgba(14,165,233,0.1)',
      border: `1px solid ${isCBO ? '#c7d2fe' : '#bae6fd'}`,
      borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap',
    }}>
      {isCBO ? 'CBO' : 'Conjunto'}
    </span>
  );
}

// ── Window card ───────────────────────────────────────────────────────────────
function WindowCard({ data, onSelectCampaign }) {
  const [expanded, setExpanded] = useState(false);
  const { window: w, spend, revenue, purchases, roas, campaigns, daysWithData } = data;
  const borderColor = roas >= 3 ? '#10b981' : roas >= 1.5 ? '#f59e0b' : roas > 0 ? '#ef4444' : 'var(--border)';
  const roasColor   = roas >= 3 ? '#10b981' : roas >= 1.5 ? '#f59e0b' : roas > 0 ? '#ef4444' : 'var(--text-muted)';
  const totalBudget = campaigns.reduce((s, c) => {
    if (!c.budgetInfo) return s;
    if (c.budgetInfo.budget_type === 'CBO') return s + (c.budgetInfo.daily_budget || 0);
    return s + (c.budgetInfo.adsets || []).reduce((x, a) => x + (a.daily_budget || 0), 0);
  }, 0);

  const visible = expanded ? campaigns : campaigns.slice(0, 3);

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--r-lg)',
      border: `1.5px solid ${borderColor}`, boxShadow: 'var(--shadow-sm)',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 20 }}>{w.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{w.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{w.start}:00 – {w.end}:00 · {daysWithData}d</div>
          </div>
        </div>
        {spend > 0 && (
          <span style={{ fontSize: 13, fontWeight: 900, color: roasColor }}>{roas.toFixed(2)}x</span>
        )}
      </div>

      {/* Primary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        <Stat label="Gasto"    value={fmtBRL(spend)} />
        <Stat label="Receita"  value={fmtBRL(revenue)} />
        {spend > 0 && (() => {
          const lucro = revenue - spend;
          const lc = lucro >= 0 ? '#10b981' : '#ef4444';
          return <Stat label="Lucro" value={(lucro >= 0 ? '+' : '') + fmtBRL(lucro)} color={lc} />;
        })()}
        <Stat label="Compras"  value={String(purchases)} />
        {totalBudget > 0 && <Stat label="Orçamento/dia" value={fmtBRL(totalBudget)} />}
      </div>

      {/* Campaign breakdown */}
      {campaigns.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
          <button onClick={() => setExpanded(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
            {expanded ? '▾' : '▸'} Campanhas ({campaigns.length})
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {visible.map(c => {
              const lucro = c.revenue - c.spend;
              const lc = lucro >= 0 ? '#10b981' : '#ef4444';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{fmtBRL(c.spend)}</span>
                  {c.revenue > 0 && <span style={{ color: lc, fontWeight: 700, flexShrink: 0 }}>{lucro >= 0 ? '+' : ''}{fmtBRL(lucro)}</span>}
                  {c.roas > 0 && <span style={{ color: c.roas >= 3 ? '#10b981' : c.roas >= 1.5 ? '#f59e0b' : '#ef4444', fontWeight: 700, flexShrink: 0 }}>{c.roas.toFixed(1)}x</span>}
                  {c.budgetInfo && <BudgetBadge type={c.budgetInfo.budget_type} />}
                </div>
              );
            })}
            {!expanded && campaigns.length > 3 && (
              <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--accent)', fontWeight: 700, padding: 0, textAlign: 'left' }}>
                + {campaigns.length - 3} mais
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '20px',
  boxShadow: 'var(--shadow-sm)',
  transition: 'box-shadow var(--t-base)',
};
