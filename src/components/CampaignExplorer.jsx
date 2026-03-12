import { useState, useEffect, useCallback } from 'react';
import { adsetsData } from '../adsetsData.js';
import { adsData } from '../adsData.js';
import { fmtBRL, fmtInt, fmtPct, fmt, calcScore, scoreColor } from '../utils.js';
import { useApp } from '../AppContext.jsx';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis
} from 'recharts';

// ─── Performance tier ───────────────────────────────────────────────────────

function getPerfTier(c) {
  if (!c) return 'poor';
  const roas = c.roas ?? 0;
  const purchases = c.purchases ?? 0;
  if (roas >= 3 || (roas >= 2 && purchases >= 5)) return 'good';
  if (roas >= 1.5 || (roas >= 1 && purchases >= 3)) return 'mid';
  return 'poor';
}

const PERF = {
  good: { color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: '#10b981' },
  mid:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: '#f59e0b' },
  poor: { color: '#ef4444', bg: 'rgba(239,68,68,0.07)',   border: '#ef4444' },
};

const PERF_LABEL = {
  good: '✅ Boa performance',
  mid:  '⚠️ Performance média',
  poor: '❌ Performance baixa',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  const s = String(d);
  if (s.includes('-')) {
    const [y, m, day] = s.split('-');
    return `${day}/${m}/${y.slice(2)}`;
  }
  return s;
}

function StatusDot({ status }) {
  const active = /active/i.test(status || '');
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: active ? '#10b981' : '#6b7280',
      marginRight: 5,
      flexShrink: 0,
    }} />
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 800,
      color: 'var(--text-primary)',
      marginBottom: 12,
      paddingLeft: 10,
      borderLeft: '3px solid var(--accent)',
      lineHeight: 1.3,
    }}>
      {children}
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 11,
      fontWeight: 600,
      color: color || 'var(--text-secondary)',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function ScoreCircle({ score }) {
  const color = scoreColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(0,0,0,0.04)`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color }}>{score}</span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Score</span>
    </div>
  );
}

// ─── Creative Modal ───────────────────────────────────────────────────────────

function CreativeModal({ item, onClose }) {
  const [techOpen, setTechOpen] = useState(false);
  if (!item) return null;
  const { ad, meta } = item;
  const creative = meta?.creative || {};

  const imgSrc   = creative.thumbnail_url || creative.image_url || null;
  const videoSrc = creative.video_source || null;
  const isVideo  = !!(creative.video_id);

  const techFields = Object.entries(creative).filter(
    ([k]) => !['thumbnail_url', 'image_url', 'title', 'body', 'video_source', 'video_embed', 'id'].includes(k)
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--r-lg)',
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
        }}
      >
        {/* Close btn */}
        <button
          onClick={onClose}
          style={{
            position: 'sticky',
            top: 0,
            float: 'right',
            marginTop: 12,
            marginRight: 12,
            zIndex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: 'var(--text-secondary)',
          }}
        >×</button>

        <div style={{ padding: '20px 20px 24px' }}>
          {/* Video or Image */}
          {isVideo && videoSrc ? (
            <video
              src={videoSrc}
              controls
              autoPlay={false}
              style={{
                width: '100%',
                borderRadius: 'var(--r-md)',
                marginBottom: 16,
                maxHeight: 360,
                display: 'block',
                background: '#000',
              }}
            />
          ) : isVideo && imgSrc ? (
            // Video but no source URL yet — show thumbnail with play indicator
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img
                src={imgSrc}
                alt={ad?.ad_name || 'Creative'}
                style={{ width: '100%', borderRadius: 'var(--r-md)', objectFit: 'cover', maxHeight: 320, display: 'block' }}
              />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--r-md)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>▶</div>
              </div>
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                Vídeo — preview indisponível (permissão da conta)
              </div>
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={ad?.ad_name || 'Creative'}
              style={{
                width: '100%',
                borderRadius: 'var(--r-md)',
                marginBottom: 16,
                objectFit: 'cover',
                maxHeight: 320,
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 180,
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              marginBottom: 16,
            }}>🖼</div>
          )}

          {/* Ad name */}
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
            {ad?.ad_name || meta?.name || '—'}
          </div>

          {/* Campaign / Adset */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            {ad?.adset_name && <span>Ad Set: <b>{ad.adset_name}</b></span>}
          </div>

          {/* Creative title */}
          {creative.title && (
            <h3 style={{ margin: '0 0 8px', fontSize: 15, color: 'var(--text-primary)' }}>{creative.title}</h3>
          )}

          {/* Body */}
          {creative.body && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              {creative.body}
            </p>
          )}

          {/* CTA / URL */}
          {(creative.call_to_action_type || creative.link_url || creative.url) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              {creative.call_to_action_type && (
                <Tag>{creative.call_to_action_type}</Tag>
              )}
              {(creative.link_url || creative.url) && (
                <a
                  href={creative.link_url || creative.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', wordBreak: 'break-all' }}
                >
                  {creative.link_url || creative.url}
                </a>
              )}
            </div>
          )}

          {/* Metrics row */}
          <div style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            {[
              ['Gasto', fmtBRL(ad?.spend)],
              ['Compras', fmtInt(ad?.purchases)],
              ['Receita', fmtBRL(ad?.revenue)],
              ['ROAS', fmt(ad?.roas, 2) + 'x'],
              ['CTR', fmtPct(ad?.ctr)],
            ].map(([label, val]) => (
              <div key={label} style={{ minWidth: 70 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{val ?? '—'}</div>
              </div>
            ))}
          </div>

          {/* Tech details collapsible */}
          {techFields.length > 0 && (
            <div>
              <button
                onClick={() => setTechOpen(o => !o)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--accent)',
                  fontWeight: 700,
                  padding: '4px 0',
                  marginBottom: 6,
                }}
              >
                {techOpen ? '▾' : '▸'} Detalhes técnicos
              </button>
              {techOpen && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  {techFields.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 120 }}>{k}:</span>
                      <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Single Campaign View ─────────────────────────────────────────────────────

function CampaignView({ campaign, apiCreativesCache, onCreativesFetched }) {
  const { filteredDaily, t, cutoffDate, endDate, effectiveDays } = useApp();
  const [creativeModal, setCreativeModal] = useState(null);

  const tier = getPerfTier(campaign);
  const perf = PERF[tier];
  const score = calcScore ? calcScore(campaign) : 0;

  // Adsets for this campaign
  const adsets = adsetsData.filter(a => String(a.campaign_id) === String(campaign.id));

  // Static ads for this campaign
  const staticAds = adsData.filter(a => String(a.campaign_id) === String(campaign.id));

  // API creatives
  const apiAds = apiCreativesCache[campaign.id] || null;

  // Fetch creatives on mount if not cached
  useEffect(() => {
    if (apiAds !== null) return;
    fetch(`/api/ads?campaign_id=${campaign.id}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then(data => {
        onCreativesFetched(campaign.id, Array.isArray(data) ? data : []);
      });
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge static ad metrics with API creative data
  const mergedAds = (() => {
    const apiList = apiAds || [];
    if (apiList.length === 0) {
      return staticAds.map(ad => ({ ad, meta: null }));
    }
    // Build map from staticAds by id
    const staticMap = Object.fromEntries(staticAds.map(a => [String(a.ad_id), a]));
    return apiList.map(meta => ({
      ad: staticMap[String(meta.id)] || null,
      meta,
    }));
  })();

  // Daily chart data
  const daily = (filteredDaily || []).filter(d => String(d.campaign_id) === String(campaign.id));

  // Metrics
  const spend = campaign.spend ?? 0;
  const revenue = campaign.revenue ?? 0;
  const profit = revenue - spend;
  const roas = campaign.roas ?? 0;

  // Structure badge: adsets count – avg ads per adset
  const numAdsets = adsets.length;
  const adsPerAdset = numAdsets > 0 ? Math.round(staticAds.length / numAdsets) : 0;
  const structureBadge = `${numAdsets}–${staticAds.length}${numAdsets > 0 ? '–' + adsPerAdset : ''}`;

  // ROAS color
  const roasColor = roas >= 3 ? '#10b981' : roas >= 1.5 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Campaign Header ───────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${perf.bg} 0%, var(--bg-card) 100%)`,
        border: `1px solid var(--border)`,
        borderTop: `3px solid ${perf.border}`,
        borderRadius: 'var(--r-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Campaign name */}
            <h2 style={{
              margin: '0 0 10px',
              fontSize: 20,
              fontWeight: 900,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}>
              {campaign.name}
            </h2>

            {/* Tags row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {campaign.account && <Tag>🏢 {campaign.account}</Tag>}
              {campaign.objective && <Tag>🎯 {campaign.objective}</Tag>}
              <Tag>
                <StatusDot status={campaign.effective_status || campaign.status} />
                {campaign.effective_status || campaign.status || '—'}
              </Tag>
              <Tag>📐 {structureBadge}</Tag>
              {(campaign.date_start || campaign.date_stop) && (
                <Tag>📅 {fmtDate(campaign.date_start)} → {fmtDate(campaign.date_stop)}</Tag>
              )}
            </div>

            {/* Perf badge + data window */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700, color: perf.color,
                background: perf.bg, border: `1px solid ${perf.border}`,
                borderRadius: 'var(--r-sm)', padding: '3px 10px',
              }}>
                {PERF_LABEL[tier]}
              </span>
              {cutoffDate && endDate && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', padding: '3px 10px',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  📆 Dados: {fmtDate(cutoffDate)} → {fmtDate(endDate)}
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>· {effectiveDays}d</span>
                </span>
              )}
            </div>
          </div>

          {/* Score circle */}
          <ScoreCircle score={typeof score === 'number' ? Math.round(score) : 0} />
        </div>
      </div>

      {/* ── Business KPIs ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader>📊 KPIs Principais</SectionHeader>

        {/* Large KPI cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 10,
        }}>
          {/* ROAS */}
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid ${roasColor}44`,
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>ROAS</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: roasColor, lineHeight: 1 }}>{fmt(roas, 2)}x</div>
          </div>

          {/* Receita */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Receita</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{fmtBRL(revenue)}</div>
          </div>

          {/* Gasto */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Gasto</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{fmtBRL(spend)}</div>
          </div>

          {/* Compras */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Compras</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{fmtInt(campaign.purchases)}</div>
          </div>

          {/* Lucro */}
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid ${profit >= 0 ? '#10b98133' : '#ef444433'}`,
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Lucro</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: profit >= 0 ? '#10b981' : '#ef4444', lineHeight: 1 }}>{fmtBRL(profit)}</div>
          </div>
        </div>

        {/* Secondary chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            ['CTR', fmtPct(campaign.ctr)],
            ['CPC', fmtBRL(campaign.cpc)],
            ['CPM', fmtBRL(campaign.cpm)],
            ['Freq', fmt(campaign.frequency, 2) + 'x'],
            ['Alcance', fmtInt(campaign.reach)],
            ['Engaj.', fmtInt(campaign.page_engagement)],
          ].map(([label, val]) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '5px 12px',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{val ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ad Sets ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>📦 Ad Sets ({adsets.length})</SectionHeader>
        {adsets.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            Nenhum ad set encontrado para esta campanha.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {adsets.map(adset => {
              const aProfit = (adset.revenue ?? 0) - (adset.spend ?? 0);
              const aRoas = adset.roas ?? 0;
              const aRoasColor = aRoas >= 3 ? '#10b981' : aRoas >= 1.5 ? '#f59e0b' : '#ef4444';
              return (
                <div
                  key={adset.adset_id}
                  className="hover-bg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: '10px 14px',
                    transition: 'background var(--t-fast)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {adset.adset_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmtDate(adset.date_start)} → {fmtDate(adset.date_stop)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Gasto: </span><b style={{ color: 'var(--text-primary)' }}>{fmtBRL(adset.spend)}</b></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Compras: </span><b style={{ color: 'var(--text-primary)' }}>{fmtInt(adset.purchases)}</b></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Receita: </span><b style={{ color: 'var(--text-primary)' }}>{fmtBRL(adset.revenue)}</b></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>ROAS: </span><b style={{ color: aRoasColor }}>{fmt(aRoas, 2)}x</b></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Lucro: </span><b style={{ color: aProfit >= 0 ? '#10b981' : '#ef4444' }}>{fmtBRL(aProfit)}</b></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Creatives ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader>🎨 Criativos ({mergedAds.length})</SectionHeader>
        {mergedAds.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            {apiAds === null ? 'Carregando criativos…' : 'Nenhum criativo encontrado.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}>
            {mergedAds.map(({ ad, meta }, idx) => {
              const creative = meta?.creative || {};
              const thumbSrc = creative.thumbnail_url || creative.image_url || null;
              const adRoas = ad?.roas ?? 0;
              const adRoasColor = adRoas >= 3 ? '#10b981' : adRoas >= 1.5 ? '#f59e0b' : '#ef4444';
              const adStatus = meta?.status || ad?.status || '';
              const adActive = /active/i.test(adStatus);
              const adName = ad?.ad_name || meta?.name || `Ad ${idx + 1}`;

              return (
                <div
                  key={meta?.id || ad?.ad_id || idx}
                  className="hover-bg"
                  onClick={() => setCreativeModal({ ad, meta })}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'box-shadow var(--t-fast), transform var(--t-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Thumbnail */}
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={adName}
                      style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        objectFit: 'cover',
                        display: 'block',
                        background: '#111',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      border: '1px solid var(--border)',
                    }}>🖼</div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: adActive ? '#10b981' : '#6b7280',
                        flexShrink: 0,
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{adName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                      <span>Gasto: <b style={{ color: 'var(--text-secondary)' }}>{fmtBRL(ad?.spend)}</b></span>
                      <span>ROAS: <b style={{ color: adRoasColor }}>{fmt(adRoas, 1)}x</b></span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Compras: <b style={{ color: 'var(--text-secondary)' }}>{fmtInt(ad?.purchases)}</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Historical Charts ──────────────────────────────────────────── */}
      {daily.length > 0 && (
        <div>
          <SectionHeader>📈 Histórico Diário</SectionHeader>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {/* Spend chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '14px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Gasto Diário
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={daily} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id={`spendGrad-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    formatter={v => [fmtBRL(v), 'Gasto']}
                    labelFormatter={l => l}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill={`url(#spendGrad-${campaign.id})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* CTR chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '14px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                CTR Diário
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={daily} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id={`ctrGrad-${campaign.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip
                    formatter={v => [fmtPct(v), 'CTR']}
                    labelFormatter={l => l}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-sm)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ctr"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill={`url(#ctrGrad-${campaign.id})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Creative Modal */}
      {creativeModal && (
        <CreativeModal item={creativeModal} onClose={() => setCreativeModal(null)} />
      )}
    </div>
  );
}

// ─── Main: CampaignExplorer ───────────────────────────────────────────────────

export default function CampaignExplorer({ campaigns, onBack }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiCreativesCache, setApiCreativesCache] = useState({});

  const handleCreativesFetched = useCallback((campaignId, ads) => {
    setApiCreativesCache(prev => ({ ...prev, [campaignId]: ads }));
  }, []);

  if (!campaigns || campaigns.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
        Nenhuma campanha selecionada.
      </div>
    );
  }

  const multi = campaigns.length > 1;
  const campaign = campaigns[Math.min(activeIndex, campaigns.length - 1)];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Top bar: Back + carousel nav ──────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background var(--t-fast)',
            flexShrink: 0,
          }}
          className="hover-bg"
        >
          ← Voltar
        </button>

        {/* Multi-campaign carousel nav */}
        {multi && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            flexWrap: 'wrap',
          }}>
            {/* Left arrow */}
            <button
              onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                width: 32,
                height: 32,
                cursor: activeIndex === 0 ? 'default' : 'pointer',
                opacity: activeIndex === 0 ? 0.4 : 1,
                fontSize: 16,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >‹</button>

            {/* Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {campaigns.map((c, idx) => {
                const t = getPerfTier(c);
                const dotColor = PERF[t].color;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={c.id || idx}
                    onClick={() => setActiveIndex(idx)}
                    title={c.name}
                    style={{
                      width: isActive ? 28 : 20,
                      height: isActive ? 28 : 20,
                      borderRadius: '50%',
                      border: `2px solid ${dotColor}`,
                      background: isActive ? dotColor : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isActive ? 11 : 9,
                      fontWeight: 900,
                      color: isActive ? '#fff' : dotColor,
                      transition: 'all var(--t-fast)',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Right arrow */}
            <button
              onClick={() => setActiveIndex(i => Math.min(campaigns.length - 1, i + 1))}
              disabled={activeIndex === campaigns.length - 1}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                width: 32,
                height: 32,
                cursor: activeIndex === campaigns.length - 1 ? 'default' : 'pointer',
                opacity: activeIndex === campaigns.length - 1 ? 0.4 : 1,
                fontSize: 16,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >›</button>

            {/* Counter */}
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--text-muted)',
              letterSpacing: 0.5,
            }}>
              {activeIndex + 1} / {campaigns.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Campaign content ───────────────────────────────────────────── */}
      <CampaignView
        key={campaign.id || activeIndex}
        campaign={campaign}
        apiCreativesCache={apiCreativesCache}
        onCreativesFetched={handleCreativesFetched}
      />
    </div>
  );
}
