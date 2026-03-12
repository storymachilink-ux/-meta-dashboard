import React, { useState } from 'react';
import { useApp } from '../AppContext.jsx';

const SEVERITY_CONFIG = {
  critical: { label: 'Crítico', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  warning:  { label: 'Atenção',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  info:     { label: 'Info',     color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
};

const TYPE_LABELS = {
  roas_below:     'ROAS Baixo',
  no_sales:       'Sem Vendas',
  high_frequency: 'Frequência Alta',
  ctr_drop:       'Queda de CTR',
  scalable:       'Escalável',
};

export default function AlertsPage() {
  const { alerts, alertsLoading, alertsSummary, dismissAlert, reloadAlerts, t } = useApp();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dismissing, setDismissing] = useState(new Set());

  const filtered = (alerts || []).filter(a => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterType !== 'all' && a.alert_type !== filterType) return false;
    return true;
  });

  const handleDismiss = async (id) => {
    setDismissing(prev => new Set(prev).add(id));
    try {
      await dismissAlert(id);
    } finally {
      setDismissing(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const alertTypes = [...new Set((alerts || []).map(a => a.alert_type))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Central de Alertas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Monitoramento automático das suas campanhas
          </p>
        </div>
        <button
          onClick={reloadAlerts}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Summary cards */}
      {alertsSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: alertsSummary.total || 0, color: '#475569', bg: '#f8fafc' },
            { label: 'Críticos', value: alertsSummary.critical || 0, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Atenção', value: alertsSummary.warning || 0, color: '#d97706', bg: '#fffbeb' },
            { label: 'Info', value: alertsSummary.info || 0, color: '#0369a1', bg: '#eff6ff' },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, borderRadius: '10px', padding: '14px 16px', border: `1px solid ${card.color}22` }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
          {['all', 'critical', 'warning', 'info'].map(s => (
            <button key={s} onClick={() => setFilterSeverity(s)}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: filterSeverity === s ? 'white' : 'transparent',
                color: filterSeverity === s ? '#1e293b' : '#64748b',
                boxShadow: filterSeverity === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {s === 'all' ? 'Todos' : SEVERITY_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {alertTypes.length > 0 && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#475569', background: 'white', cursor: 'pointer' }}
          >
            <option value="all">Todos os tipos</option>
            {alertTypes.map(type => (
              <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {alertsLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #cbd5e1', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Carregando alertas...
        </div>
      )}

      {!alertsLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
            {(alerts || []).length === 0 ? 'Nenhum alerta ativo' : 'Nenhum alerta nesta categoria'}
          </div>
          <div style={{ fontSize: '13px' }}>
            {(alerts || []).length === 0
              ? 'Suas campanhas estão dentro dos parâmetros normais.'
              : 'Tente remover os filtros para ver todos os alertas.'}
          </div>
        </div>
      )}

      {!alertsLoading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const isDismissing = dismissing.has(alert.id);
            return (
              <div key={alert.id} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                opacity: isDismissing ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}>
                {/* Dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: '4px' }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{alert.title}</span>
                    <span style={{ fontSize: '11px', background: cfg.color + '20', color: cfg.color, padding: '2px 7px', borderRadius: '999px', fontWeight: 600 }}>
                      {SEVERITY_CONFIG[alert.severity]?.label || alert.severity}
                    </span>
                    <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '999px' }}>
                      {TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{alert.message}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
                    {alert.date_ref && <span>📅 {alert.date_ref}</span>}
                    {alert.entity_name && <span>📢 {alert.entity_name}</span>}
                    {alert.metric_value != null && (
                      <span>Valor: <strong style={{ color: '#475569' }}>{Number(alert.metric_value).toFixed(2)}</strong></span>
                    )}
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  disabled={isDismissing}
                  title="Dispensar alerta"
                  style={{
                    flexShrink: 0, background: 'none', border: '1px solid ' + cfg.border,
                    borderRadius: '6px', padding: '4px 10px', cursor: isDismissing ? 'default' : 'pointer',
                    fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap',
                  }}
                >
                  {isDismissing ? '...' : '✕ Dispensar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
