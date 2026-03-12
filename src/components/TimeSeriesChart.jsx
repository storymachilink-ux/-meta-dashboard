import React, { useMemo, useState } from 'react';
import { useApp } from '../App.jsx';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899'];

export default function TimeSeriesChart() {
  const { t, filteredDaily, cutoffDate, endDate, effectiveDays, dateMode, customDateStart, customDateEnd, days } = useApp();
  const [metric, setMetric] = useState('spend');
  const [groupBy, setGroupBy] = useState('account');

  const isSingleDay = effectiveDays === 1 || (filteredDaily.length > 0 && [...new Set(filteredDaily.map(d => d.date))].length === 1);

  const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const periodLabel = (() => {
    if (dateMode === 'custom' && customDateStart && customDateEnd) {
      if (customDateStart === customDateEnd) return fmtDate(customDateStart);
      return `${fmtDate(customDateStart)} – ${fmtDate(customDateEnd)}`;
    }
    if (days === 1) return `Hoje · ${fmtDate(endDate)}`;
    return `${fmtDate(cutoffDate)} – ${fmtDate(endDate)} · ${effectiveDays}d`;
  })();

  const customTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginBottom: '2px', fontWeight: 600 }}>
            <span style={{ fontWeight: 400, color: '#64748b' }}>{p.name}: </span>
            {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        ))}
      </div>
    );
  };

  const totalByDay = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      if (!map[d.date]) map[d.date] = { date: d.date, spend: 0, clicks: 0, impressions: 0, ctr_sum: 0, ctr_count: 0 };
      map[d.date].spend += d.spend;
      map[d.date].clicks += d.clicks;
      map[d.date].impressions += d.impressions;
      if (d.ctr > 0) { map[d.date].ctr_sum += d.ctr; map[d.date].ctr_count++; }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d, date: d.date.slice(5),
      ctr: d.ctr_count > 0 ? +(d.ctr_sum / d.ctr_count).toFixed(2) : 0,
      cpc: d.clicks > 0 ? +(d.spend / d.clicks).toFixed(2) : 0,
      cpm: d.impressions > 0 ? +((d.spend / d.impressions) * 1000).toFixed(2) : 0,
    }));
  }, [filteredDaily]);

  const withAvg = useMemo(() => totalByDay.map((d, i) => {
    const w = totalByDay.slice(Math.max(0, i - 6), i + 1);
    return { ...d, spend_avg7: +(w.reduce((s, x) => s + x.spend, 0) / w.length).toFixed(2) };
  }), [totalByDay]);

  const groups = useMemo(() => {
    const set = new Set();
    filteredDaily.forEach(d => set.add(groupBy === 'account' ? d.account : d.campaign_name));
    return Array.from(set);
  }, [filteredDaily, groupBy]);

  const byGroup = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      const key = d.date.slice(5);
      const grp = groupBy === 'account' ? d.account : d.campaign_name;
      if (!map[key]) map[key] = { date: key };
      map[key][grp] = (map[key][grp] || 0) + (d[metric] || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDaily, metric, groupBy]);

  if (filteredDaily.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94a3b8', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '40px' }}>📊</span>
      <span>{t.noData}</span>
      <span style={{ fontSize: '12px' }}>Tente ampliar o período de datas</span>
    </div>
  );

  const metricOpts = [
    { value: 'spend', label: 'Investimento (R$)' },
    { value: 'clicks', label: 'Cliques' },
    { value: 'impressions', label: 'Impressões' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Period header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          <span style={{ color: '#94a3b8' }}>Período:</span>{' '}
          <span style={{ color: '#1e293b', fontWeight: 700 }}>{periodLabel}</span>
        </div>
        {isSingleDay && (
          <span style={{ fontSize: '11px', background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', borderRadius: '999px', padding: '2px 10px', fontWeight: 600 }}>
            Visão de 1 dia
          </span>
        )}
      </div>

      <ChartCard title="📈 Investimento Diário (R$)">
        <ResponsiveContainer width="100%" height={220}>
          {isSingleDay ? (
            <BarChart data={withAvg} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => 'R$' + v} />
              <Tooltip content={customTip} />
              <Bar dataKey="spend" fill="#6366f1" name="Invest. R$" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={withAvg} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => 'R$' + v} />
              <Tooltip content={customTip} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="spend" stroke="#6366f1" fill="url(#spendArea)" strokeWidth={2} dot={false} name="Invest. R$" />
              <Line type="monotone" dataKey="spend_avg7" stroke="#f59e0b" strokeWidth={2} dot={false} name="Média 7d R$" strokeDasharray="5 3" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="🎯 CTR Médio Diário (%)">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={totalByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={customTip} />
              <Line type="monotone" dataKey="ctr" stroke="#10b981" dot={false} strokeWidth={2} name="CTR %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="🏷 CPC Médio Diário (R$)">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={totalByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={customTip} />
              <Line type="monotone" dataKey="cpc" stroke="#f59e0b" dot={false} strokeWidth={2} name="CPC R$" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="📊 Por Conta / Campanha"
        controls={
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={metric} onChange={e => setMetric(e.target.value)} style={selStyle}>
              {metricOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selStyle}>
              <option value="account">Por Conta</option>
              <option value="campaign">Por Campanha</option>
            </select>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byGroup} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={customTip} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {groups.slice(0, 7).map((g, i) => (
              <Bar key={g} dataKey={g} stackId="a" fill={COLORS[i % COLORS.length]} name={g?.length > 28 ? g.slice(0, 28) + '…' : g} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="📡 CPM Diário (R$/mil imp.)">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={totalByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={customTip} />
            <Line type="monotone" dataKey="cpm" stroke="#8b5cf6" dot={false} strokeWidth={2} name="CPM R$" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children, controls }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{title}</div>
        {controls}
      </div>
      {children}
    </div>
  );
}

const selStyle = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  color: '#334155', padding: '6px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer',
};
