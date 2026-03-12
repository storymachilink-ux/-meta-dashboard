import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext.jsx';
import { adsData } from '../adsData.js';
import { adsetsData } from '../adsetsData.js';
import { fmtBRL, fmtInt, fmtPct, scoreColor } from '../utils.js';

function adScore(ad) {
  let s = 50;
  if (ad.ctr >= 3) s += 28; else if (ad.ctr >= 2) s += 20; else if (ad.ctr >= 1) s += 10; else if (ad.ctr < 0.5) s -= 12;
  if (ad.cpc > 0 && ad.cpc < 1) s += 18; else if (ad.cpc < 2) s += 10; else if (ad.cpc < 4) s += 3; else s -= 10;
  if (ad.roas >= 3) s += 20; else if (ad.roas >= 1.5) s += 10; else if (ad.roas > 0 && ad.roas < 1) s -= 10;
  if (ad.purchases > 10) s += 10; else if (ad.purchases > 0) s += 5;
  if (ad.frequency > 3.5) s -= 15;
  if (ad.video_p50 > 0 && ad.impressions > 0 && ad.video_p50 / ad.impressions > 0.3) s += 8;
  return Math.max(0, Math.min(100, s));
}

export default function CreativeCards() {
  const { days, cutoffDate, selectedAccount } = useApp();
  const [tab, setTab] = useState('ads');

  const filteredAds = useMemo(() => {
    return adsData.filter(ad => {
      if (selectedAccount !== 'all' && ad.account !== selectedAccount) return false;
      if (ad.spend < 5) return false;
      return true;
    });
  }, [adsData, selectedAccount]);

  const filteredAdsets = useMemo(() => {
    return adsetsData.filter(a => {
      if (selectedAccount !== 'all' && a.account !== selectedAccount) return false;
      if (a.spend < 5) return false;
      return true;
    });
  }, [adsetsData, selectedAccount]);

  const topAds = useMemo(() =>
    [...filteredAds].map(a => ({ ...a, score: adScore(a) }))
      .sort((a, b) => (b.purchases * 10 + b.spend / 10) - (a.purchases * 10 + a.spend / 10))
      .slice(0, 5),
    [filteredAds]);

  const topAdsets = useMemo(() =>
    [...filteredAdsets].map(a => ({ ...a, score: adScore(a) }))
      .sort((a, b) => (b.purchases * 10 + b.spend / 10) - (a.purchases * 10 + a.spend / 10))
      .slice(0, 5),
    [filteredAdsets]);

  const items = tab === 'ads' ? topAds : topAdsets;
  const nameField = tab === 'ads' ? 'ad_name' : 'adset_name';

  const top3 = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div>
      {/* Tab header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>🏆 Destaques de Conversão</div>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          {[['ads', '📣 Criativos'], ['adsets', '🗂 Conjuntos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: tab === id ? 'white' : 'transparent', color: tab === id ? '#6366f1' : '#94a3b8', boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '12px' }}>
        {top3.map((item, i) => (
          <TopCard key={item.ad_id || item.adset_id} item={item} rank={i + 1} nameField={nameField} tab={tab} />
        ))}
      </div>

      {/* Positions 4-5 horizontal */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rest.map((item, i) => (
            <HorizontalCard key={item.ad_id || item.adset_id} item={item} rank={i + 4} nameField={nameField} tab={tab} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopCard({ item, rank, nameField, tab }) {
  const sc = item.score;
  const scoreCol = scoreColor(sc);
  const rankColors = { 1: { bg: 'linear-gradient(135deg, #fef9c3, #fef08a)', border: '#fbbf24', medal: '🥇', titleSize: '17px' }, 2: { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', medal: '🥈', titleSize: '15px' }, 3: { bg: 'linear-gradient(135deg, #fff7ed, #fed7aa)', border: '#f97316', medal: '🥉', titleSize: '14px' } };
  const rc = rankColors[rank] || rankColors[3];

  return (
    <div style={{ background: rc.bg, border: '1.5px solid ' + rc.border, borderRadius: '16px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
      {/* Rank medal */}
      <div style={{ position: 'absolute', top: 12, right: 14, fontSize: '24px' }}>{rc.medal}</div>

      {/* Ad name — large */}
      <div style={{ fontSize: rc.titleSize, fontWeight: 900, color: '#0f172a', marginBottom: '6px', lineHeight: 1.2, paddingRight: '32px' }}>
        {item[nameField] || '—'}
      </div>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '14px' }}>
        {tab === 'ads' && (
          <>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
              <span style={{ color: '#94a3b8' }}>Conjunto: </span>
              <span style={{ fontWeight: 600 }}>{item.adset_name?.slice(0, 35) || '—'}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              <span style={{ color: '#94a3b8' }}>Campanha: </span>
              <span style={{ fontWeight: 600 }}>{item.campaign_name?.slice(0, 35) || '—'}</span>
            </div>
          </>
        )}
        {tab === 'adsets' && (
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            <span style={{ color: '#94a3b8' }}>Campanha: </span>
            <span style={{ fontWeight: 600 }}>{item.campaign_name?.slice(0, 40) || '—'}</span>
          </div>
        )}
      </div>

      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <MetricMini label="Investido" value={fmtBRL(item.spend)} />
        <MetricMini label="Compras" value={item.purchases > 0 ? fmtInt(item.purchases) : '—'} highlight={item.purchases > 0} />
        <MetricMini label="CTR" value={fmtPct(item.ctr)} color={item.ctr >= 2 ? '#10b981' : item.ctr >= 1 ? '#f59e0b' : '#ef4444'} />
        <MetricMini label="CPC" value={item.cpc > 0 ? fmtBRL(item.cpc) : '—'} color={item.cpc < 1.5 ? '#10b981' : item.cpc < 3 ? '#f59e0b' : '#ef4444'} />
        <MetricMini label="ROAS" value={item.roas > 0 ? item.roas.toFixed(2) + 'x' : '—'} color={item.roas >= 3 ? '#10b981' : item.roas >= 1.5 ? '#f59e0b' : item.roas > 0 ? '#ef4444' : undefined} />
        <MetricMini label="CPA" value={item.cpa_purchase ? fmtBRL(item.cpa_purchase) : '—'} />
      </div>

      {/* Impressions + reach */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <MiniTag label="Impressões" value={fmtInt(item.impressions)} />
        <MiniTag label="Alcance" value={fmtInt(item.reach)} />
        {item.cpm > 0 && <MiniTag label="CPM" value={fmtBRL(item.cpm)} />}
        {item.video_views > 0 && <MiniTag label="Views" value={fmtInt(item.video_views)} />}
      </div>

      {/* Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.account}</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color: scoreCol, background: scoreCol + '18', padding: '3px 10px', borderRadius: '8px' }}>
          Score {sc}
        </span>
      </div>
    </div>
  );
}

function HorizontalCard({ item, rank, nameField, tab }) {
  const sc = item.score;
  const scoreCol = scoreColor(sc);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#64748b', flexShrink: 0 }}>
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item[nameField] || '—'}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tab === 'ads' ? (item.adset_name + ' › ' + item.campaign_name) : item.campaign_name}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
        <StatChip label="Gasto" val={fmtBRL(item.spend)} />
        <StatChip label="Compras" val={item.purchases > 0 ? fmtInt(item.purchases) : '—'} />
        <StatChip label="CTR" val={fmtPct(item.ctr)} color={item.ctr >= 2 ? '#10b981' : item.ctr >= 1 ? '#f59e0b' : '#ef4444'} />
        <StatChip label="ROAS" val={item.roas > 0 ? item.roas.toFixed(2) + 'x' : '—'} color={item.roas >= 3 ? '#10b981' : item.roas >= 1.5 ? '#f59e0b' : item.roas > 0 ? '#ef4444' : undefined} />
        <span style={{ fontSize: '11px', fontWeight: 800, color: scoreCol, background: scoreCol + '18', padding: '3px 10px', borderRadius: '8px' }}>{sc}</span>
      </div>
    </div>
  );
}

function MetricMini({ label, value, color, highlight }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '6px 8px' }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 800, color: color || (highlight ? '#10b981' : '#0f172a') }}>{value}</div>
    </div>
  );
}

function MiniTag({ label, value }) {
  return (
    <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ color: '#94a3b8' }}>{label}: </span>{value}
    </span>
  );
}

function StatChip({ label, val, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: color || '#1e293b' }}>{val}</div>
    </div>
  );
}
