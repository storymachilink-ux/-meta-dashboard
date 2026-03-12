import React, { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { fmtBRL, fmtInt, fmtPct, fmt, scoreColor } from '../utils.js';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import PeriodPills from './PeriodPills.jsx';

export default function Overview({ onSelectCampaign }) {
  const { t, summary, filteredCampaigns, filteredDaily, days, periodMetrics,
    scaleRecs, pauseRecs, testRecs, recsLoading } = useApp();

  const { totalSpend, totalImpressions, totalClicks, avgCTR, avgCPC, avgCPM,
    totalPurchases, totalRevenue, avgROAS, totalReach, totalEngagement } = summary;

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
    { key: 'reach',        value: fmtInt(totalReach),           color: '#a78bfa', spark: [],          icon: '🎯' },
  ];

  const topSpend = useMemo(() => [...filteredCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 5), [filteredCampaigns]);
  const bestCTR  = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200).sort((a, b) => b.ctr - a.ctr).slice(0, 5), [filteredCampaigns]);
  const worstCTR = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200 && c.ctr > 0).sort((a, b) => a.ctr - b.ctr).slice(0, 5), [filteredCampaigns]);
  const highFreq = useMemo(() => filteredCampaigns.filter(c => c.frequency > 2).sort((a, b) => b.frequency - a.frequency).slice(0, 5), [filteredCampaigns]);

  const periodLabel = days <= 3 ? `${days} dias` : days === 7 ? '7 dias' : days === 15 ? '15 dias' : days === 30 ? 'mês' : `${days} dias`;

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
          <MetricCard key={m.key} label={t.metrics[m.key]} value={m.value} color={m.color} icon={m.icon} sparkData={m.spark} />
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

      {/* Decision Panel — DB recs or computed priorities */}
      {(scaleRecs?.length > 0 || pauseRecs?.length > 0 || testRecs?.length > 0) ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>🎯 Painel de Decisão</div>
            <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
              IA · Banco de dados
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{c.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtBRL(spend || c.spend)}</span>
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
    </div>
  );
}

/* ── Sub-components ── */

function MetricCard({ label, value, color, icon, sparkData }) {
  return (
    <div className="hover-card" style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      {sparkData && sparkData.length > 3 && (
        <div style={{ marginTop: 10, height: 40 }}>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: color + '45', borderRadius: '0 0 var(--r-lg) var(--r-lg)' }} />
    </div>
  );
}

function RankCard({ title, items, field, fmt: fmtFn, onSelect, positive, negative }) {
  return (
    <div style={card}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((c, i) => (
          <div key={c.id} onClick={() => onSelect(c)} className="hover-bg"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background var(--t-fast)' }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: negative ? 'var(--danger)' : positive ? 'var(--success)' : 'var(--accent)', flexShrink: 0 }}>{fmtFn(c[field])}</span>
          </div>
        ))}
        {items.length === 0 && <EmptyState text="—" />}
      </div>
    </div>
  );
}

function Chip({ val, color }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color, background: color + '18', padding: '2px 8px', borderRadius: 999 }}>{val}</span>
  );
}

function EmptyState({ text }) {
  return <div style={{ fontSize: '12px', color: 'var(--text-disabled)', textAlign: 'center', padding: '16px 0' }}>{text}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.1px' }}>{children}</div>;
}

function DecisionCol({ icon, label, color, bg, border, recs, campaigns, onSelect }) {
  if (!recs?.length) return (
    <div style={{ borderRadius: 'var(--r-md)', border: `1px dashed ${border}`, padding: '16px', opacity: 0.45, textAlign: 'center' }}>
      <div style={{ fontSize: '22px', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '12px', fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: 4 }}>Nenhuma agora</div>
    </div>
  );
  return (
    <div style={{ borderRadius: 'var(--r-md)', border: `1px solid ${border}`, background: bg, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{label}</span>
        <span style={{ marginLeft: 'auto', background: color, color: 'white', fontSize: '10px', fontWeight: 800, borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{recs.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recs.slice(0, 4).map((r, i) => {
          const camp = campaigns.find(c => c.id === r.entity_id || c.name === r.entity_name);
          return (
            <div key={i} onClick={() => camp && onSelect(camp)}
              style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '8px 10px', cursor: camp ? 'pointer' : 'default', transition: 'all var(--t-fast)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { if (camp) { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                {r.entity_name || '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {r.message || r.reason || '—'}
              </div>
              {r.metric_value != null && (
                <div style={{ fontSize: '10.5px', color, fontWeight: 700, marginTop: 4 }}>
                  Valor: {typeof r.metric_value === 'number' ? r.metric_value.toFixed(2) : r.metric_value}
                </div>
              )}
            </div>
          );
        })}
        {recs.length > 4 && (
          <div style={{ fontSize: '11px', color, textAlign: 'center', fontWeight: 600, padding: '4px 0' }}>
            +{recs.length - 4} mais
          </div>
        )}
      </div>
    </div>
  );
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '18px 20px',
  boxShadow: 'var(--shadow-sm)',
  transition: 'box-shadow var(--t-base)',
};
