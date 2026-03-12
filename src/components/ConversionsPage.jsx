import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext.jsx';
import { adsData } from '../adsData.js';
import { fmtBRL, fmtInt, fmtPct, calcScore, scoreColor } from '../utils.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import CreativeCards from './CreativeCards.jsx';
import SmartAnalysis from './SmartAnalysis.jsx';
import PeriodPills from './PeriodPills.jsx';

export default function ConversionsPage({ onSelectCampaign }) {
  const { filteredCampaigns, selectedAccount, effectiveDays } = useApp();
  const [subTab, setSubTab] = useState('overview');

  const salesCampaigns = useMemo(() =>
    filteredCampaigns.filter(c => c.objective?.includes('SALES')).sort((a, b) => b.spend - a.spend),
    [filteredCampaigns]);

  const totalSpend = salesCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = salesCampaigns.reduce((s, c) => s + c.revenue, 0);
  const totalPurchases = salesCampaigns.reduce((s, c) => s + c.purchases, 0);
  const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCPA = totalPurchases > 0 ? totalSpend / totalPurchases : null;
  const avgTicket = totalPurchases > 0 && totalRevenue > 0 ? totalRevenue / totalPurchases : null;

  const bestCPA = useMemo(() => {
    const cpas = salesCampaigns
      .filter(c => c.purchases > 3 && c.spend > 50)
      .map(c => c.spend / c.purchases)
      .sort((a, b) => a - b);
    return cpas.length > 0 ? cpas[0] : null;
  }, [salesCampaigns]);

  // Top campaigns used as proxy for adset-level data (period-filtered via filteredCampaigns)
  const topAdsets = useMemo(() =>
    [...filteredCampaigns].filter(c => c.purchases > 0 || c.spend > 20)
      .sort((a, b) => b.purchases - a.purchases || b.spend - a.spend).slice(0, 5)
      .map(c => ({ adset_id: c.id, adset_name: c.name, campaign_name: c.account, spend: c.spend, purchases: c.purchases, ctr: c.ctr, roas: c.roas })),
    [filteredCampaigns]);

  const roasData = salesCampaigns.filter(c => c.spend > 5).sort((a, b) => b.roas - a.roas).slice(0, 8)
    .map(c => ({ name: c.name.slice(0, 20) + (c.name.length > 20 ? '...' : ''), roas: +c.roas.toFixed(2) }));

  const vsRevData = salesCampaigns.filter(c => c.spend > 5).slice(0, 6)
    .map(c => ({ name: c.name.slice(0, 14) + '...', spend: +c.spend.toFixed(2), revenue: +c.revenue.toFixed(2) }));

  const tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.fill || '#1e293b' }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : p.value}</div>
        ))}
      </div>
    );
  };

  const SUB_TABS = [
    { id: 'overview', label: '📊 Visão Geral' },
    { id: 'creatives', label: '🏆 Criativos' },
    { id: 'analysis', label: '🧠 Análise Inteligente' },
    { id: 'table', label: '📋 Tabela Completa' },
  ];

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 5, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          {SUB_TABS.map(st => (
            <button key={st.id} onClick={() => setSubTab(st.id)}
              style={{ padding: '7px 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: subTab === st.id ? 'var(--accent)' : 'transparent', color: subTab === st.id ? 'white' : 'var(--text-secondary)', transition: 'all var(--t-fast)', whiteSpace: 'nowrap' }}>
              {st.label}
            </button>
          ))}
        </div>
        <PeriodPills />
      </div>

      {/* OVERVIEW */}
      {subTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <KpiTile label="Investido (Vendas)" value={fmtBRL(totalSpend)} color="#6366f1" icon="💰" />
            <KpiTile label="Receita Atribuída" value={fmtBRL(totalRevenue)} color={totalRevenue > totalSpend ? '#10b981' : '#ef4444'} icon="💵" sub={totalRevenue > totalSpend ? 'Lucrativo' : totalRevenue > 0 ? 'Abaixo do gasto' : ''} />
            <KpiTile label="ROAS Médio" value={avgROAS.toFixed(2) + 'x'} color={avgROAS >= 3 ? '#10b981' : avgROAS >= 1.5 ? '#f59e0b' : '#ef4444'} icon="📈" sub={avgROAS >= 3 ? 'Excelente' : avgROAS >= 1.5 ? 'Moderado' : 'Abaixo do ideal'} />
            <KpiTile label="Compras" value={fmtInt(totalPurchases)} color="#10b981" icon="🛒" />
            <KpiTile label="CPA Médio" value={avgCPA ? fmtBRL(avgCPA) : '--'} color="#f59e0b" icon="🎯" sub={bestCPA ? 'Melhor: ' + fmtBRL(bestCPA) : ''} />
            <KpiTile label="Ticket Médio" value={avgTicket ? fmtBRL(avgTicket) : '--'} color="#8b5cf6" icon="🏷" sub="receita / compra" />
          </div>

          {/* Benchmarks */}
          {(avgCPA || avgTicket) && (
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>📌 Benchmarks</div>
              {avgCPA && <Bench label="CPA Atual" value={fmtBRL(avgCPA)} />}
              {bestCPA && <Bench label="Menor CPA" value={fmtBRL(bestCPA)} good />}
              {avgTicket && <Bench label="Ticket Médio" value={fmtBRL(avgTicket)} />}
              {avgROAS > 0 && <Bench label="ROAS" value={avgROAS.toFixed(2) + 'x'} good={avgROAS >= 3} />}
              <div style={{ fontSize: '12px', color: 'var(--accent)', marginLeft: 'auto' }}>
                {bestCPA && avgCPA && avgCPA > bestCPA * 1.5
                  ? ('CPA atual ' + Math.round((avgCPA / bestCPA - 1) * 100) + '% acima do melhor')
                  : avgCPA ? 'CPA dentro do intervalo esperado' : ''}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={CS}>
              <STitle>📊 ROAS por Campanha</STitle>
              {roasData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={roasData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} width={130} />
                    <Tooltip content={tip} />
                    <Bar dataKey="roas" name="ROAS" radius={[0, 5, 5, 0]}>
                      {roasData.map((d, i) => <Cell key={i} fill={d.roas >= 3 ? '#10b981' : d.roas >= 1.5 ? '#f59e0b' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </div>
            <div style={CS}>
              <STitle>💰 Investimento vs Receita</STitle>
              {vsRevData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vsRevData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={tip} />
                    <Bar dataKey="spend" fill="#6366f1" name="Investido R$" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="revenue" fill="#10b981" name="Receita R$" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </div>
          </div>

          {topAdsets.length > 0 && (
            <div style={CS}>
              <STitle>🗂 Melhores Campanhas do Período</STitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topAdsets.map((a, i) => (
                  <div key={a.adset_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--r-md)', background: i === 0 ? 'var(--success-soft)' : 'var(--bg-subtle)', border: '1px solid ' + (i === 0 ? 'var(--success)' : 'var(--border-subtle)') }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700, width: 20 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.adset_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campaign_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <SP label="Gasto" val={fmtBRL(a.spend)} />
                      <SP label="Compras" val={a.purchases > 0 ? fmtInt(a.purchases) : '--'} color={a.purchases > 0 ? '#10b981' : undefined} />
                      <SP label="CTR" val={fmtPct(a.ctr)} color={a.ctr >= 2 ? '#10b981' : a.ctr >= 1 ? '#f59e0b' : '#ef4444'} />
                      <SP label="ROAS" val={a.roas > 0 ? a.roas.toFixed(2) + 'x' : '--'} color={a.roas >= 3 ? '#10b981' : a.roas >= 1.5 ? '#f59e0b' : a.roas > 0 ? '#ef4444' : undefined} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'creatives' && <CreativeCards />}
      {subTab === 'analysis' && <SmartAnalysis />}

      {subTab === 'table' && (
        <div style={CS}>
          <STitle>📋 Campanhas de Vendas — Completo</STitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['Campanha', 'Conta', 'Investido', 'Receita', 'ROAS', 'Compras', 'CPA', 'Ticket', 'CTR', 'CPC', 'Freq.', 'Score'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesCampaigns.map(c => {
                  const score = calcScore(c); const sc = scoreColor(score);
                  const cpa = c.purchases > 0 ? c.spend / c.purchases : null;
                  const ticket = c.purchases > 0 && c.revenue > 0 ? c.revenue / c.purchases : null;
                  return (
                    <tr key={c.id} onClick={() => onSelectCampaign(c)}
                      className="table-row"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', maxWidth: 170 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 500 }} title={c.name}>{c.name}</span></td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>{c.account}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtBRL(c.spend)}</td>
                      <td style={{ padding: '10px 12px', color: c.revenue > c.spend ? 'var(--success)' : c.revenue > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>{c.revenue > 0 ? fmtBRL(c.revenue) : '--'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: c.roas >= 3 ? 'var(--success)' : c.roas >= 1.5 ? 'var(--warning)' : c.roas > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{c.roas > 0 ? c.roas.toFixed(2) + 'x' : '--'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{c.purchases > 0 ? fmtInt(c.purchases) : '--'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{cpa ? fmtBRL(cpa) : '--'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--accent)', fontWeight: 600 }}>{ticket ? fmtBRL(ticket) : '--'}</td>
                      <td style={{ padding: '10px 12px', color: c.ctr >= 2 ? 'var(--success)' : c.ctr >= 1 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>{fmtPct(c.ctr)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{c.cpc > 0 ? fmtBRL(c.cpc) : '--'}</td>
                      <td style={{ padding: '10px 12px', color: c.frequency > 3 ? 'var(--danger)' : c.frequency > 2 ? 'var(--warning)' : 'var(--text-muted)' }}>{c.frequency > 0 ? c.frequency.toFixed(2) + 'x' : '--'}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 22, borderRadius: 6, background: sc + '18', color: sc, fontSize: '11px', fontWeight: 800 }}>{score}</span></td>
                    </tr>
                  );
                })}
                {salesCampaigns.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Sem campanhas de vendas no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value, color, icon, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid ' + color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Bench({ label, value, good }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: good ? 'var(--success)' : 'var(--accent)' }}>{value}</div>
    </div>
  );
}
function SP({ label, val, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: color || 'var(--text-primary)' }}>{val}</div>
    </div>
  );
}
function STitle({ children }) {
  return <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.1px' }}>{children}</div>;
}
function Empty() {
  return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>Sem dados suficientes</div>;
}
const CS = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' };
