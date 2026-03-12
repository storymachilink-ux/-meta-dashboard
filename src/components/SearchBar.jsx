import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App.jsx';

function parseInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

function TableBlock({ rows }) {
  const parsed = rows.map(r => r.split('|').filter(Boolean).map(c => c.trim()));
  const dataRows = parsed.filter(r => !r.every(c => /^[-\s]+$/.test(c)));
  if (!dataRows.length) return null;
  return (
    <div style={{ margin: '8px 0', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {dataRows.map((cells, ri) => (
        <div key={ri} style={{
          display: 'flex',
          background: ri === 0 ? 'var(--bg-subtle)' : ri % 2 === 0 ? 'var(--bg-subtle)' : 'var(--bg-card)',
          borderBottom: ri < dataRows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          {cells.map((cell, ci) => (
            <div key={ci} style={{
              flex: ci === 0 ? '0 0 140px' : 1,
              padding: '6px 10px', fontSize: '12px',
              color: ri === 0 ? 'var(--text-secondary)' : ci === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              fontWeight: ri === 0 ? 700 : ci === cells.length - 1 ? 600 : 400,
            }}>
              {parseInline(cell)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BodyContent({ body }) {
  const elements = [];
  let tableBuffer = [];
  const flushTable = () => {
    if (tableBuffer.length) { elements.push(<TableBlock key={elements.length} rows={tableBuffer} />); tableBuffer = []; }
  };
  body.forEach((line, i) => {
    if (!line) { flushTable(); elements.push(<div key={i} style={{ height: 6 }} />); return; }
    if (line.startsWith('|')) { tableBuffer.push(line); return; }
    flushTable();
    elements.push(<div key={i} style={{ lineHeight: 1.65 }}>{parseInline(line)}</div>);
  });
  flushTable();
  return <>{elements}</>;
}

function AiMessage({ icon, headline, body }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'flex-start' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', boxShadow: '0 2px 8px rgba(24,119,242,0.25)',
      }}>
        {icon}
      </div>
      <div style={{
        flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '4px var(--r-xl) var(--r-xl) var(--r-xl)',
        padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
          {parseInline(headline)}
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <BodyContent body={body} />
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white', borderRadius: 'var(--r-xl) var(--r-xl) 4px var(--r-xl)',
        padding: '10px 16px', maxWidth: '72%', fontSize: '13.5px', lineHeight: 1.55,
        boxShadow: '0 3px 12px rgba(99,102,241,0.28)',
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
      }}>✦</div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px var(--r-xl) var(--r-xl) var(--r-xl)', padding: '16px 20px', boxShadow: 'var(--shadow-xs)' }}>
        <style>{`@keyframes chatBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'chatBounce 1.3s infinite', animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchBar() {
  const { t, days, chatHistory, setChatHistory, handleAsk } = useApp();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasMessages = chatHistory && chatHistory.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, typing]);

  const submit = (q) => {
    const query = (typeof q === 'string' ? q : input).trim();
    if (!query) return;
    setInput('');
    setTyping(true);
    setTimeout(() => {
      handleAsk(query);
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 500);
  };

  const clear = () => setChatHistory([]);
  const periodLabel = days <= 3 ? `${days} dias` : days === 7 ? '7 dias' : days === 30 ? 'mês' : `${days} dias`;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--r-xl)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
      marginBottom: 24, overflow: 'hidden',
      transition: 'background var(--t-slow), border-color var(--t-slow)',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 3px 10px rgba(24,119,242,0.25)',
          }}>✦</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Assistente de Dados</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 1 }}>
              Respostas baseadas nos últimos <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{periodLabel}</strong> selecionados
            </div>
          </div>
        </div>
        {hasMessages && (
          <button onClick={clear} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', padding: '5px 12px',
            transition: 'all var(--t-fast)', fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            Nova conversa
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      {hasMessages && (
        <div style={{ maxHeight: 440, overflowY: 'auto', padding: '20px 20px 6px', background: 'var(--bg-subtle)' }}>
          {chatHistory.map((msg, i) =>
            msg.role === 'user'
              ? <UserMessage key={i} text={msg.text} />
              : <AiMessage key={i} icon={msg.icon} headline={msg.headline} body={msg.body} />
          )}
          {typing && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input + Suggestions ── */}
      <div style={{ padding: hasMessages ? '12px 16px 16px' : '16px 20px 20px' }}>
        {/* Suggestions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600 }}>
            {hasMessages ? 'Continue:' : 'Sugestões:'}
          </span>
          {(hasMessages ? t.search.suggestions.slice(0, 4) : t.search.suggestions).map((s, i) => (
            <button key={i} onClick={() => submit(s)} style={{
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 999, padding: '4px 12px',
              cursor: 'pointer', fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500,
              transition: 'all var(--t-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-input)', borderRadius: 'var(--r-md)', padding: '10px 14px',
            border: '1.5px solid var(--border-input)', transition: 'border-color var(--t-fast)',
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-input)'}
          >
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', flexShrink: 0 }}>🔍</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder={t.search.placeholder}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', background: 'transparent' }}
            />
            {input && (
              <button onClick={() => setInput('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-disabled)', padding: 0 }}>✕</button>
            )}
          </div>
          <button
            onClick={() => submit()} disabled={!input.trim() || typing}
            style={{
              background: input.trim() && !typing ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-subtle)',
              border: '1px solid ' + (input.trim() && !typing ? 'transparent' : 'var(--border)'),
              borderRadius: 'var(--r-md)', padding: '11px 20px',
              cursor: input.trim() && !typing ? 'pointer' : 'default',
              fontSize: '13px', fontWeight: 700,
              color: input.trim() && !typing ? 'white' : 'var(--text-muted)',
              boxShadow: input.trim() && !typing ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              transition: 'all var(--t-fast)', whiteSpace: 'nowrap',
            }}
          >
            ✦ Perguntar
          </button>
        </div>
      </div>
    </div>
  );
}
