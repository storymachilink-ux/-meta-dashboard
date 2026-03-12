import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import { fmtBRL, fmtInt, fmtPct, fmt, scoreColor, getRecommendations, calcScore } from '../utils.js';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import CampaignCreatives from './CampaignCreatives.jsx';

const OBJ_LABELS = { OUTCOME_SALES: 'Vendas', OUTCOME_ENGAGEMENT: 'Engajamento', OUTCOME_AWARENESS: 'Reconhecimento', LINK_CLICKS: 'Cliques' };
const OBJ_COLORS = { OUTCOME_SALES: '#10b981', OUTCOME_ENGAGEMENT: '#6366f1', OUTCOME_AWARENESS: '#f59e0b', LINK_CLICKS: '#0ea5e9' };

export default function CampaignDetail({ campaign: c, onBack }) {
  const { t, filteredDaily, pinnedIds, togglePin, lang, TODAY } = useApp();

  // Hourly data state
  const yesterday = useMemo(() => {
    const d = new Date(TODAY); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  }, [TODAY]);
  const [hourlyDate, setHourlyDate] = useState(yesterday);
  const [hourlyData, setHourlyData] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyMetric, setHourlyMetric] = useState('spend');

  useEffect(() => {
    if (!c.id) return;
    setHourlyLoading(true);
    fetch(`/api/hourly?date=${hourlyDate}&entity_id=${c.id}&level=campaign`)
      .then(r => r.json())
      .then(d => { setHourlyData(d.hourly || []); })
      .catch(() => setHourlyData([]))
      .finally(() => setHourlyLoading(false));
  }, [c.id, hourlyDate]);
  const score = calcScore(c);
  const scoreCol = scoreColor(score);
  const recs = getRecommendations(c, t);
  const isPinned = pinnedIds.has(c.id);

  const campDaily = useMemo(() =>
    filteredDaily.filter(d => d.campaign_id === c.id).sort((a, b) => a.date.localeCompare(b.date)),
    [filteredDaily, c.id]);

  const chartData = campDaily.map(d => ({
    date: d.date.slice(5),
    spend: d.spend, ctr: d.ctr, cpc: d.cpc,
    clicks: d.clicks, impressions: d.impressions,
  }));

  const recColors = { danger: '#ef4444', warning: '#f59e0b', success: '#10b981', info: '#3b82f6' };
  const recBg = { danger: '#fef2f2', warning: '#fffbeb', success: '#f0fdf4', info: '#eff6ff' };
  const recBorder = { danger: '#fecaca', warning: '#fde68a', success: '#bbf7d0', info: '#bfdbfe' };

  const objColor = OBJ_COLORS[c.objective] || '#6366f1';

  const metrics = [
    { label: t.metrics.totalSpend, value: fmtBRL(c.spend), color: '#6366f1', icon: '💰' },
    { label: t.metrics.impressions, value: fmtInt(c.impressions), color: '#8b5cf6', icon: '👁' },
    { label: t.metrics.clicks, value: fmtInt(c.clicks), color: '#0ea5e9', icon: '🖱' },
    { label: t.metrics.ctr, value: fmtPct(c.ctr), color: c.ctr >= 2 ? '#10b981' : c.ctr >= 1 ? '#f59e0b' : '#ef4444', icon: '📊' },
    { label: t.metrics.cpc, value: c.cpc > 0 ? fmtBRL(c.cpc) : '—', color: c.cpc < 1.5 ? '#10b981' : c.cpc < 3 ? '#f59e0b' : '#ef4444', icon: '🏷' },
    { label: t.metrics.cpm, value: fmtBRL(c.cpm), color: '#06b6d4', icon: '📡' },
    { label: t.metrics.reach, value: fmtInt(c.reach), color: '#a78bfa', icon: '🎯' },
    { label: t.metrics.frequency, value: c.frequency > 0 ? c.frequency.toFixed(2) + 'x' : '—', color: c.frequency > 3.5 ? '#ef4444' : c.frequency > 2.5 ? '#f59e0b' : '#10b981', icon: '🔁' },
    { label: t.metrics.purchases, value: c.purchases > 0 ? fmtInt(c.purchases) : '—', color: '#10b981', icon: '🛒' },
    { label: t.metrics.revenue, value: c.revenue > 0 ? fmtBRL(c.revenue) : '—', color: '#22d3ee', icon: '💵' },
    { label: t.metrics.roas, value: c.roas > 0 ? c.roas.toFixed(2) + 'x' : '—', color: c.roas >= 3 ? '#10b981' : c.roas >= 1.5 ? '#f59e0b' : c.roas > 0 ? '#ef4444' : '#94a3b8', icon: '📈' },
    { label: t.metrics.engagement, value: fmtInt(c.page_engagement), color: '#ec4899', icon: '❤️' },
  ];

  return (
    <div>
      {/* Header card */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{c.name}</h2>
              <button onClick={() => togglePin(c.id)}
                title={t.pinHint}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: isPinned ? '#fbbf24' : '#cbd5e1' }}>
                {isPinned ? '★' : '☆'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Tag color="#6366f1">{c.account}</Tag>
              <Tag color={objColor}>{OBJ_LABELS[c.objective] || c.objective}</Tag>
              <Tag color="#64748b">📅 {c.date_start} → {c.date_stop}</Tag>
              {c._period && <Tag color="#1d4ed8">P</Tag>}
            </div>
          </div>
          {/* Score circle */}
          <div style={{ textAlign: 'center', padding: '12px 20px', background: scoreCol + '10', borderRadius: '12px', border: '1px solid ' + scoreCol + '30' }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: scoreCol, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>Score</div>
            <div style={{ fontSize: '10px', color: scoreCol, fontWeight: 600 }}>
              {score >= 80 ? '🚀 Excelente' : score >= 60 ? '✅ Bom' : score >= 40 ? '⚠️ Regular' : '🔴 Crítico'}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{m.label}</span>
              <span style={{ fontSize: '14px' }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Recommendations */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>💡 {t.recommendations}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recs.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 13px', borderRadius: '10px', background: recBg[r.type], border: '1px solid ' + recBorder[r.type] }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{r.icon}</span>
                <span style={{ fontSize: '12px', color: recColors[r.type], lineHeight: 1.5, fontWeight: 500 }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Radar/summary */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>📊 Indicadores</div>
          <IndicatorBar label="CTR" value={Math.min(c.ctr / 5 * 100, 100)} color={c.ctr >= 2 ? '#10b981' : c.ctr >= 1 ? '#f59e0b' : '#ef4444'} display={c.ctr.toFixed(2) + '%'} />
          <IndicatorBar label="CPC Eficiência" value={c.cpc > 0 ? Math.min(100, (5 / c.cpc) * 40) : 0} color={c.cpc < 1.5 ? '#10b981' : c.cpc < 3 ? '#f59e0b' : '#ef4444'} display={c.cpc > 0 ? fmtBRL(c.cpc) : '—'} />
          <IndicatorBar label="Freq. Saúde" value={c.frequency > 0 ? Math.max(0, 100 - (c.frequency - 1) * 25) : 50} color={c.frequency > 3.5 ? '#ef4444' : c.frequency > 2.5 ? '#f59e0b' : '#10b981'} display={c.frequency > 0 ? c.frequency.toFixed(2) + 'x' : '—'} />
          {c.roas > 0 && <IndicatorBar label="ROAS" value={Math.min(c.roas / 5 * 100, 100)} color={c.roas >= 3 ? '#10b981' : c.roas >= 1.5 ? '#f59e0b' : '#ef4444'} display={c.roas.toFixed(2) + 'x'} />}
          <IndicatorBar label="Score Geral" value={score} color={scoreCol} display={score + '/100'} />
        </div>
      </div>

      {/* Daily Charts */}
      {chartData.length > 1 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <SmallChart title={t.charts?.dailySpend || 'Investimento Diário (R$)'} data={chartData} dataKey="spend" color="#6366f1" area />
          <SmallChart title={t.charts?.ctrDaily || 'CTR Diário (%)'} data={chartData} dataKey="ctr" color="#10b981" />
          <SmallChart title={t.charts?.cpcDaily || 'CPC Diário (R$)'} data={chartData} dataKey="cpc" color="#f59e0b" />
          <SmallChart title={t.charts?.clicksDaily || 'Cliques Diários'} data={chartData} dataKey="clicks" color="#0ea5e9" />
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
          Dados históricos diários não disponíveis para esta campanha no período selecionado.
        </div>
      )}

      {/* Hourly performance */}
      <HourlyPanel
        data={hourlyData}
        loading={hourlyLoading}
        date={hourlyDate}
        onDateChange={setHourlyDate}
        metric={hourlyMetric}
        onMetricChange={setHourlyMetric}
        TODAY={TODAY}
        yesterday={yesterday}
      />

      {/* Creative previews */}
      <CampaignCreatives campaignId={c.id} />
    </div>
  );
}

function IndicatorBar({ label, value, color, display }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '12px', color, fontWeight: 700 }}>{display}</span>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '4px', background: color, width: value + '%', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function SmallChart({ title, data, dataKey, color, area }) {
  const tipFmt = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
        <div style={{ color, fontWeight: 700 }}>{payload[0].name}: {Number(payload[0].value).toFixed(2)}</div>
      </div>
    );
  };
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '12px' }}>{title}</div>
      <ResponsiveContainer width="100%" height={140}>
        {area ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={`ag-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={tipFmt} />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#ag-${dataKey})`} strokeWidth={2} dot={false} name={dataKey} />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={tipFmt} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={dataKey} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: color + '15', color, border: '1px solid ' + color + '30' }}>
      {children}
    </span>
  );
}

const HOURLY_METRICS = [
  { key: 'spend',   label: 'Investimento', color: '#6366f1', fmt: v => 'R$ ' + v.toFixed(2) },
  { key: 'clicks',  label: 'Cliques',      color: '#0ea5e9', fmt: v => fmtInt(v) },
  { key: 'ctr',     label: 'CTR (%)',       color: '#10b981', fmt: v => v.toFixed(2) + '%' },
  { key: 'purchases', label: 'Compras',    color: '#f59e0b', fmt: v => fmtInt(v) },
];

function HourlyPanel({ data, loading, date, onDateChange, metric, onMetricChange, TODAY, yesterday }) {
  const metaCfg = HOURLY_METRICS.find(m => m.key === metric) || HOURLY_METRICS[0];
  const maxVal = Math.max(...data.map(d => d[metric] || 0), 1);

  // Best hour
  const bestHour = data.length ? data.reduce((best, d) => (d[metric] || 0) > (best[metric] || 0) ? d : best, data[0]) : null;

  const tipFmt = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#94a3b8', marginBottom: '2px' }}>{payload[0].payload.hour}h</div>
        <div style={{ color: metaCfg.color, fontWeight: 700 }}>{metaCfg.fmt(payload[0].value)}</div>
      </div>
    );
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>⏰ Performance por Hora</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Metric selector */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            {HOURLY_METRICS.map(m => (
              <button key={m.key} onClick={() => onMetricChange(m.key)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  background: metric === m.key ? 'white' : 'transparent',
                  color: metric === m.key ? m.color : '#94a3b8',
                  boxShadow: metric === m.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >{m.label}</button>
            ))}
          </div>
          {/* Date selector */}
          <input type="date" value={date} max={TODAY}
            onChange={e => onDateChange(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Best hour badge */}
      {bestHour && !loading && data.length > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: metaCfg.color + '10', border: '1px solid ' + metaCfg.color + '30', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: metaCfg.color, fontWeight: 600, marginBottom: '12px' }}>
          ⚡ Melhor hora: {bestHour.hour}h — {metaCfg.fmt(bestHour[metric] || 0)}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#94a3b8', fontSize: '13px', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Carregando dados horários...
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Sem dados horários para {date}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false}
              tickFormatter={v => v % 3 === 0 ? v + 'h' : ''} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={tipFmt} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i}
                  fill={(d[metric] || 0) === maxVal ? metaCfg.color : metaCfg.color + '55'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
