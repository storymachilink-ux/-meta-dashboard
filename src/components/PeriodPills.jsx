import React, { useState, useRef } from 'react';
import { useApp } from '../App.jsx';

const PRESETS = [3, 7, 15, 30];

export default function PeriodPills({ compact = false }) {
  const { days, setDays, dateMode, setDateMode, setCustomDateStart, setCustomDateEnd, customDateStart, customDateEnd, TODAY } = useApp();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const yesterday = (() => { const d = new Date(TODAY); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const isYesterdayActive = dateMode === 'custom' && customDateStart === yesterday && customDateEnd === yesterday;

  const setRelative = (d) => { setDays(d); setDateMode('relative'); setCustomDateStart(''); setCustomDateEnd(''); };
  const setYesterday = () => { setDateMode('custom'); setCustomDateStart(yesterday); setCustomDateEnd(yesterday); setDays(1); };

  const handleCustom = () => { setEditing(true); setInputVal(''); setTimeout(() => inputRef.current?.focus(), 50); };
  const confirmCustom = () => { const n = parseInt(inputVal); if (n > 0 && n <= 365) setRelative(n); setEditing(false); };

  const isToday  = dateMode === 'relative' && days === 1;
  const isCustom = (dateMode === 'custom' && !isYesterdayActive) || (!PRESETS.includes(days) && days !== 1 && dateMode === 'relative');

  const pill = (active, special) => ({
    padding: compact ? '4px 10px' : '5px 13px',
    borderRadius: 999, border: '1.5px solid',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background: active ? 'var(--accent)' : special ? 'var(--warning-soft)' : 'var(--bg-subtle)',
    color: active ? 'white' : special ? 'var(--warning)' : 'var(--text-secondary)',
    fontSize: compact ? '11px' : '12px', fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all var(--t-fast)',
    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {!compact && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Período:</span>}

      {/* Hoje */}
      <button onClick={() => setRelative(1)} style={pill(isToday, !isToday)}
        onMouseEnter={e => { if (!isToday) { e.currentTarget.style.borderColor = 'var(--warning)'; e.currentTarget.style.color = 'var(--warning)'; }}}
        onMouseLeave={e => { if (!isToday) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
      >Hoje</button>

      {/* Ontem */}
      <button onClick={setYesterday} style={pill(isYesterdayActive, !isYesterdayActive)}
        onMouseEnter={e => { if (!isYesterdayActive) { e.currentTarget.style.borderColor = 'var(--warning)'; e.currentTarget.style.color = 'var(--warning)'; }}}
        onMouseLeave={e => { if (!isYesterdayActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
      >Ontem</button>

      {PRESETS.map(d => {
        const active = dateMode === 'relative' && days === d;
        return (
          <button key={d} onClick={() => setRelative(d)} style={{
            padding: compact ? '4px 10px' : '5px 13px',
            borderRadius: 999, border: '1.5px solid',
            borderColor: active ? 'var(--accent)' : 'var(--border)',
            background: active ? 'var(--accent)' : 'var(--bg-subtle)',
            color: active ? 'white' : 'var(--text-secondary)',
            fontSize: compact ? '11px' : '12px', fontWeight: 700,
            cursor: 'pointer', transition: 'all var(--t-fast)',
            boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}}
          onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
          >{d}d</button>
        );
      })}

      {/* Custom input */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            ref={inputRef} type="number" min="1" max="365"
            value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmCustom(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={confirmCustom} placeholder="dias"
            style={{ width: 58, padding: '4px 8px', borderRadius: 999, border: '1.5px solid var(--accent)', fontSize: '12px', outline: 'none', textAlign: 'center', color: 'var(--text-primary)', background: 'var(--bg-input)' }}
          />
        </div>
      ) : (
        <button onClick={handleCustom} style={{
          padding: compact ? '4px 10px' : '5px 13px',
          borderRadius: 999, border: '1.5px solid',
          borderColor: isCustom ? 'var(--accent)' : 'var(--border)',
          background: isCustom ? 'var(--accent)' : 'var(--bg-subtle)',
          color: isCustom ? 'white' : 'var(--text-muted)',
          fontSize: compact ? '11px' : '12px', fontWeight: 600,
          cursor: 'pointer', transition: 'all var(--t-fast)',
        }}>
          {isCustom && dateMode !== 'custom' ? days + 'd' : isCustom ? '⌖ custom' : '+ dias'}
        </button>
      )}
    </div>
  );
}
