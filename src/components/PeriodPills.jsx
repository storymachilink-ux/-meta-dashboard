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

  const setRelative = (d) => {
    setDays(d);
    setDateMode('relative');
    setCustomDateStart('');
    setCustomDateEnd('');
  };

  const setYesterday = () => {
    setDateMode('custom');
    setCustomDateStart(yesterday);
    setCustomDateEnd(yesterday);
    setDays(1);
  };

  const handleCustom = () => {
    setEditing(true);
    setInputVal('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmCustom = () => {
    const n = parseInt(inputVal);
    if (n > 0 && n <= 365) setRelative(n);
    setEditing(false);
  };

  const isToday = dateMode === 'relative' && days === 1;
  const isCustom = (dateMode === 'custom' && !isYesterdayActive) || (!PRESETS.includes(days) && days !== 1 && dateMode === 'relative');

  const pillStyle = (active, special) => ({
    padding: compact ? '4px 10px' : '5px 13px',
    borderRadius: '999px', border: '1.5px solid',
    borderColor: active ? '#6366f1' : '#e2e8f0',
    background: active ? '#6366f1' : special ? '#fef9c3' : 'white',
    color: active ? 'white' : special ? '#92400e' : '#64748b',
    fontSize: compact ? '11px' : '12px', fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all 0.15s',
    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {!compact && <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Período:</span>}

      {/* Hoje */}
      <button onClick={() => setRelative(1)}
        style={pillStyle(isToday, !isToday)}
        onMouseEnter={e => { if (!isToday) { e.currentTarget.style.borderColor = '#fde68a'; e.currentTarget.style.color = '#92400e'; } }}
        onMouseLeave={e => { if (!isToday) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; } }}
      >
        Hoje
      </button>

      {/* Ontem */}
      <button onClick={setYesterday}
        style={pillStyle(isYesterdayActive, !isYesterdayActive)}
        onMouseEnter={e => { if (!isYesterdayActive) { e.currentTarget.style.borderColor = '#fde68a'; e.currentTarget.style.color = '#92400e'; } }}
        onMouseLeave={e => { if (!isYesterdayActive) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; } }}
      >
        Ontem
      </button>

      {PRESETS.map(d => {
        const active = dateMode === 'relative' && days === d;
        return (
          <button key={d} onClick={() => setRelative(d)}
            style={{
              padding: compact ? '4px 10px' : '5px 13px',
              borderRadius: '999px', border: '1.5px solid',
              borderColor: active ? '#6366f1' : '#e2e8f0',
              background: active ? '#6366f1' : 'white',
              color: active ? 'white' : '#64748b',
              fontSize: compact ? '11px' : '12px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.color = '#6366f1'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; } }}
          >
            {d}d
          </button>
        );
      })}

      {/* Custom input */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            ref={inputRef}
            type="number" min="1" max="365"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmCustom(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={confirmCustom}
            placeholder="dias"
            style={{ width: 56, padding: '4px 8px', borderRadius: '999px', border: '1.5px solid #6366f1', fontSize: '12px', outline: 'none', textAlign: 'center', color: '#1e293b' }}
          />
        </div>
      ) : (
        <button onClick={handleCustom}
          style={{
            padding: compact ? '4px 10px' : '5px 13px',
            borderRadius: '999px', border: '1.5px solid',
            borderColor: isCustom ? '#6366f1' : '#e2e8f0',
            background: isCustom ? '#6366f1' : 'white',
            color: isCustom ? 'white' : '#94a3b8',
            fontSize: compact ? '11px' : '12px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isCustom && dateMode !== 'custom' ? days + 'd' : isCustom ? '⌖ custom' : '+ dias'}
        </button>
      )}
    </div>
  );
}
