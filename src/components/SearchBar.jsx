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
    <div style={{ margin: '8px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {dataRows.map((cells, ri) => (
        <div key={ri} style={{
          display: 'flex',
          background: ri === 0 ? '#f1f5f9' : ri % 2 === 0 ? '#fafafa' : 'white',
          borderBottom: ri < dataRows.length - 1 ? '1px solid #f1f5f9' : 'none',
        }}>
          {cells.map((cell, ci) => (
            <div key={ci} style={{
              flex: ci === 0 ? '0 0 140px' : 1,
              padding: '6px 10px',
              fontSize: '12px',
              color: ri === 0 ? '#475569' : ci === 0 ? '#64748b' : '#0f172a',
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
    if (tableBuffer.length) {
      elements.push(<TableBlock key={elements.length} rows={tableBuffer} />);
      tableBuffer = [];
    }
  };

  body.forEach((line, i) => {
    if (!line) {
      flushTable();
      elements.push(<div key={i} style={{ height: '7px' }} />);
      return;
    }
    if (line.startsWith('|')) {
      tableBuffer.push(line);
      return;
    }
    flushTable();
    elements.push(
      <div key={i} style={{ lineHeight: 1.65 }}>
        {parseInline(line)}
      </div>
    );
  });
  flushTable();

  return <>{elements}</>;
}

function AiMessage({ icon, headline, body }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', flexShrink: 0,
        boxShadow: '0 2px 8px rgba(24,119,242,0.25)',
      }}>
        {icon}
      </div>
      <div style={{
        flex: 1,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '4px 16px 16px 16px',
        padding: '16px 18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.4 }}>
          {parseInline(headline)}
        </div>
        <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <BodyContent body={body} />
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white',
        borderRadius: '16px 16px 4px 16px',
        padding: '10px 16px',
        maxWidth: '70%',
        fontSize: '14px',
        lineHeight: 1.5,
        boxShadow: '0 2px 10px rgba(99,102,241,0.25)',
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '17px', flexShrink: 0,
      }}>✦</div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px 16px 16px 16px', padding: '16px 20px' }}>
        <style>{`@keyframes chatBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
              animation: 'chatBounce 1.3s infinite',
              animationDelay: `${i * 0.18}s`,
            }} />
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
    // Small delay for typing UX then call handleAsk which updates chatHistory
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
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      marginBottom: '24px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #1877F2, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', boxShadow: '0 2px 8px rgba(24,119,242,0.2)',
          }}>✦</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Assistente de Dados</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Respostas baseadas nos últimos <strong style={{ color: '#6366f1' }}>{periodLabel}</strong> selecionados
            </div>
          </div>
        </div>
        {hasMessages && (
          <button onClick={clear} style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
            cursor: 'pointer', fontSize: '12px', color: '#94a3b8', padding: '5px 12px',
          }}>
            Nova conversa
          </button>
        )}
      </div>

      {/* Chat messages */}
      {hasMessages && (
        <div style={{
          maxHeight: '440px', overflowY: 'auto',
          padding: '20px 20px 6px',
          background: '#fafbfc',
        }}>
          {chatHistory.map((msg, i) =>
            msg.role === 'user'
              ? <UserMessage key={i} text={msg.text} />
              : <AiMessage key={i} icon={msg.icon} headline={msg.headline} body={msg.body} />
          )}
          {typing && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input + suggestions */}
      <div style={{ padding: hasMessages ? '12px 16px 16px' : '16px 20px 20px' }}>
        {/* Suggestions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
            {hasMessages ? 'Continue:' : 'Sugestões:'}
          </span>
          {(hasMessages ? t.search.suggestions.slice(0, 4) : t.search.suggestions).map((s, i) => (
            <button key={i} onClick={() => submit(s)}
              style={{
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '999px', padding: '4px 12px',
                cursor: 'pointer', fontSize: '11px', color: '#475569', fontWeight: 500,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
            background: '#f8fafc', borderRadius: '12px', padding: '10px 16px',
            border: '1.5px solid #e2e8f0', transition: 'border-color 0.15s',
          }}
            onFocus={() => {}}
          >
            <span style={{ fontSize: '15px', opacity: 0.45 }}>🔍</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder={t.search.placeholder}
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: '14px', color: '#0f172a', background: 'transparent',
              }}
            />
            {input && (
              <button onClick={() => setInput('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#cbd5e1', padding: 0 }}>
                ✕
              </button>
            )}
          </div>
          <button onClick={() => submit()}
            disabled={!input.trim() || typing}
            style={{
              background: input.trim() && !typing
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : '#f1f5f9',
              border: 'none', borderRadius: '12px',
              padding: '11px 22px', cursor: input.trim() && !typing ? 'pointer' : 'default',
              fontSize: '13px', fontWeight: 700,
              color: input.trim() && !typing ? 'white' : '#94a3b8',
              boxShadow: input.trim() && !typing ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
            ✦ Perguntar
          </button>
        </div>
      </div>
    </div>
  );
}
