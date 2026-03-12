import React, { useMemo } from 'react';
import { useApp } from '../App.jsx';
import { fmtBRL, fmtInt, fmtPct, fmt, scoreColor } from '../utils.js';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import PeriodPills from './PeriodPills.jsx';

export default function Overview({ onSelectCampaign }) {
  const { t, summary, filteredCampaigns, filteredDaily, days, periodMetrics } = useApp();

  const { totalSpend, totalImpressions, totalClicks, avgCTR, avgCPC, avgCPM,
    totalPurchases, totalRevenue, avgROAS, totalReach, totalEngagement } = summary;

  // Sparkline data per metric (aggregate daily by date)
  const spendByDay = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      map[d.date] = (map[d.date] || 0) + d.spend;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, v }));
  }, [filteredDaily]);

  const clicksByDay = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => { map[d.date] = (map[d.date] || 0) + d.clicks; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, v }));
  }, [filteredDaily]);

  const metrics = [
    { key: 'totalSpend', value: fmtBRL(totalSpend), color: '#6366f1', spark: spendByDay, icon: '💰', change: null },
    { key: 'impressions', value: fmtInt(totalImpressions), color: '#8b5cf6', spark: [], icon: '👁', change: null },
    { key: 'clicks', value: fmtInt(totalClicks), color: '#0ea5e9', spark: clicksByDay, icon: '🖱', change: null },
    { key: 'ctr', value: fmtPct(avgCTR), color: avgCTR >= 2 ? '#10b981' : avgCTR >= 1 ? '#f59e0b' : '#ef4444', spark: [], icon: '📊', change: null },
    { key: 'cpc', value: fmtBRL(avgCPC), color: avgCPC < 1.5 ? '#10b981' : avgCPC < 3 ? '#f59e0b' : '#ef4444', spark: [], icon: '🏷', change: null },
    { key: 'cpm', value: fmtBRL(avgCPM), color: '#06b6d4', spark: [], icon: '📡', change: null },
    { key: 'purchases', value: fmtInt(totalPurchases), color: '#10b981', spark: [], icon: '🛒', change: null },
    { key: 'roas', value: fmt(avgROAS) + 'x', color: avgROAS >= 3 ? '#10b981' : avgROAS >= 1.5 ? '#f59e0b' : '#ef4444', spark: [], icon: '📈', change: null },
    { key: 'reach', value: fmtInt(totalReach), color: '#a78bfa', spark: [], icon: '🎯', change: null },
  ];

  const topSpend = useMemo(() => [...filteredCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 5), [filteredCampaigns]);
  const bestCTR = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200).sort((a, b) => b.ctr - a.ctr).slice(0, 5), [filteredCampaigns]);
  const worstCTR = useMemo(() => filteredCampaigns.filter(c => c.impressions > 200 && c.ctr > 0).sort((a, b) => a.ctr - b.ctr).slice(0, 5), [filteredCampaigns]);
  const highFreq = useMemo(() => filteredCampaigns.filter(c => c.frequency > 2).sort((a, b) => b.frequency - a.frequency).slice(0, 5), [filteredCampaigns]);

  const periodLabel = days <= 3 ? `${days} dias` : days === 7 ? '7 dias' : days === 15 ? '15 dias' : days === 30 ? 'mês' : `${days} dias`;

  const priorities = useMemo(() => {
    // Group filteredDaily by campaign to detect period-specific patterns
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

      // Sales with zero purchases in period
      if (camp.objective?.includes('SALES') && totalPurchases === 0 && totalSpend > 30) {
        reasons.push({ type: 'danger', icon: '❌', text: `Sem conversões nos últimos ${periodLabel}: ${fmtBRL(totalSpend)} gastos sem retorno` });
      }

      // CTR crítico no período
      if (periodCTR < 0.5 && totalSpend > 20 && totalImpressions > 500) {
        reasons.push({ type: 'danger', icon: '📉', text: `CTR de ${fmtPct(periodCTR)} nos últimos ${periodLabel} — criativo não está engajando` });
      }

      // High frequency
      if (camp.frequency > 3.5) {
        reasons.push({ type: 'danger', icon: '🔁', text: `Frequência ${camp.frequency.toFixed(1)}x — público saturado, renovar criativo` });
      }

      // CTR declining: compare first half vs second half of period
      const sorted = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length >= 6) {
        const mid = Math.floor(sorted.length / 2);
        const h1 = sorted.slice(0, mid);
        const h2 = sorted.slice(mid);
        const imp1 = h1.reduce((s, d) => s + d.impressions, 0);
        const imp2 = h2.reduce((s, d) => s + d.impressions, 0);
        const ctr1 = imp1 > 0 ? (h1.reduce((s, d) => s + d.clicks, 0) / imp1) * 100 : 0;
        const ctr2 = imp2 > 0 ? (h2.reduce((s, d) => s + d.clicks, 0) / imp2) * 100 : 0;
        if (ctr1 > 0.5 && ctr2 < ctr1 * 0.55 && ctr2 < 1) {
          reasons.push({ type: 'warning', icon: '⚠️', text: `CTR caindo: ${fmtPct(ctr1)} → ${fmtPct(ctr2)} na segunda metade do período` });
        }
      }

      if (reasons.length > 0) {
        alerts.push({ c: camp, recs: reasons, spend: totalSpend });
      }
    });

    // Also include campaigns with no daily data but lifetime issues
    filteredCampaigns.forEach(c => {
      if (byCampaign[c.id]) return;
      if (c.spend < 10) return;
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
      <div style={{ marginBottom: '16px' }}><PeriodPills /></div>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {metrics.map(m => (
          <MetricCard key={m.key} label={t.metrics[m.key]} value={m.value} color={m.color} icon={m.icon} sparkData={m.spark} />
        ))}
      </div>

      {/* Account breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={card}>
          <SectionTitle>{t.byAccount}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {accountBreakdown.map(a => (
              <div key={a.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{a.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{fmtBRL(a.spend)} · {a.count} camp.</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '7px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', width: (a.spend / maxSpend * 100) + '%', transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{fmtInt(a.impressions)} imp. · {fmtInt(a.clicks)} cliques</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales snapshot */}
        <div style={card}>
          <SectionTitle>💰 {t.metrics.roas} & {t.metrics.revenue}</SectionTitle>
          {filteredCampaigns.filter(c => c.objective?.includes('SALES') && c.spend > 5).sort((a, b) => b.roas - a.roas).slice(0, 6).map(c => (
            <div key={c.id} onClick={() => onSelectCampaign(c)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '12px', color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{c.name}</span>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
        <RankCard title={`💸 ${t.topSpend}`} items={topSpend} field="spend" fmt={fmtBRL} onSelect={onSelectCampaign} />
        <RankCard title={`🎯 ${t.bestCTR}`} items={bestCTR} field="ctr" fmt={(v) => v.toFixed(2) + '%'} onSelect={onSelectCampaign} positive />
        <RankCard title={`⚠️ ${t.worstCTR}`} items={worstCTR} field="ctr" fmt={(v) => v.toFixed(2) + '%'} onSelect={onSelectCampaign} negative />
        <RankCard title={`🔁 ${t.highFreq}`} items={highFreq} field="frequency" fmt={(v) => v.toFixed(2) + 'x'} onSelect={onSelectCampaign} negative />
      </div>

      {/* Priority actions */}
      {priorities.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>🚨 {t.priorities}</div>
            <span style={{ fontSize: '11px', color: '#94a3b8', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '999px', padding: '3px 10px' }}>
              Últimos {periodLabel}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {priorities.map(({ c, recs, spend }) => (
              <div key={c.id} onClick={() => onSelectCampaign(c)}
                style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{c.name}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{fmtBRL(spend || c.spend)}</span>
                </div>
                {recs.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ fontSize: '11px', color: r.type === 'danger' ? '#dc2626' : '#b45309', display: 'flex', gap: '5px', marginTop: '4px', lineHeight: 1.45 }}>
                    <span style={{ flexShrink: 0 }}>{r.icon}</span><span>{r.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color, icon, sparkData }) {
  return (
    <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '10px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
          {icon}
        </div>
      </div>
      {sparkData && sparkData.length > 3 && (
        <div style={{ marginTop: '10px', height: 40 }}>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: color + '40', borderRadius: '0 0 12px 12px' }} />
    </div>
  );
}

function RankCard({ title, items, field, fmt: fmtFn, onSelect, positive, negative }) {
  return (
    <div style={card}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((c, i) => (
          <div key={c.id} onClick={() => onSelect(c)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '7px', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700, width: '16px', textAlign: 'center' }}>{i + 1}</span>
            <span style={{ fontSize: '12px', color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: negative ? '#ef4444' : positive ? '#10b981' : '#6366f1', flexShrink: 0 }}>{fmtFn(c[field])}</span>
          </div>
        ))}
        {items.length === 0 && <EmptyState text="—" />}
      </div>
    </div>
  );
}

function Chip({ val, color }) {
  return <span style={{ fontSize: '11px', fontWeight: 700, color, background: color + '15', padding: '2px 7px', borderRadius: '999px' }}>{val}</span>;
}

function EmptyState({ text }) {
  return <div style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'center', padding: '16px 0' }}>{text}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>{children}</div>;
}

const card = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px',
  padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};
