import React, { useState, useEffect } from 'react';

const STATUS_COLORS = {
  ACTIVE:   { color: '#10b981', label: 'Ativo'   },
  PAUSED:   { color: '#f59e0b', label: 'Pausado' },
  ARCHIVED: { color: '#94a3b8', label: 'Arquivado' },
};

export default function CampaignCreatives({ campaignId }) {
  const [ads, setAds]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [open, setOpen]     = useState(false);

  useEffect(() => {
    if (!open || !campaignId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/ads?campaign_id=${campaignId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAds(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, campaignId]);

  return (
    <div style={{ marginTop: 16 }}>
      {/* Expandable header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: open ? 'var(--r-lg) var(--r-lg) 0 0' : 'var(--r-lg)',
          padding: '13px 18px', cursor: 'pointer',
          transition: 'all var(--t-fast)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '15px' }}>🎨</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Preview de Criativos
          </span>
          {ads.length > 0 && (
            <span style={{ fontSize: '11px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '1px 8px', fontWeight: 700 }}>
              {ads.length} anúncios
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform var(--t-fast)', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 var(--r-lg) var(--r-lg)', padding: '16px',
        }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 0', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Carregando criativos...
            </div>
          )}

          {error && (
            <div style={{ padding: '16px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--danger)' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && ads.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhum anúncio encontrado para esta campanha.
            </div>
          )}

          {!loading && ads.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {ads.map(ad => {
                const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url;
                const statusCfg = STATUS_COLORS[ad.status] || { color: '#94a3b8', label: ad.status };
                return (
                  <div key={ad.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', overflow: 'hidden',
                    transition: 'all var(--t-fast)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Thumbnail */}
                    <div style={{ height: 130, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {thumb ? (
                        <img
                          src={thumb} alt={ad.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div style={{ display: thumb ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '32px', color: 'var(--text-disabled)' }}>
                        🖼
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                        {ad.creative?.title || ad.name}
                      </div>
                      {ad.creative?.body && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, marginBottom: 6 }}>
                          {ad.creative.body}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '10px', color: statusCfg.color, fontWeight: 700 }}>{statusCfg.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
