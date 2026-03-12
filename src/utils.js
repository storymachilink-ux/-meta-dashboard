export const fmt = (n, decimals = 2) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtBRL = (n) =>
  n == null ? '—' : 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR');

export const fmtPct = (n) =>
  n == null ? '—' : Number(n).toFixed(2) + '%';

export const scoreColor = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

export function getRecommendations(c, t) {
  const recs = [];
  const flags = [];
  const r = t?.recs;

  if (c.ctr < 0.5) {
    recs.push({ type: 'danger', icon: '⚠️', text: r ? r.lowCtr(c.ctr.toFixed(2)) : 'CTR muito baixo (' + c.ctr.toFixed(2) + '%). Teste novos criativos.' });
  } else if (c.ctr < 1.5) {
    recs.push({ type: 'warning', icon: '💡', text: r ? r.avgCtr(c.ctr.toFixed(2)) : 'CTR abaixo da média (' + c.ctr.toFixed(2) + '%).' });
  } else if (c.ctr >= 3) {
    recs.push({ type: 'success', icon: '✅', text: r ? r.highCtr(c.ctr.toFixed(2)) : 'CTR excelente (' + c.ctr.toFixed(2) + '%). Escale o orçamento.' });
  }

  if (c.cpc > 5) {
    recs.push({ type: 'danger', icon: '💸', text: r ? r.highCpc(c.cpc.toFixed(2)) : 'CPC alto (R$ ' + c.cpc.toFixed(2) + ').' });
  } else if (c.cpc > 2) {
    recs.push({ type: 'warning', icon: '📊', text: r ? r.midCpc(c.cpc.toFixed(2)) : 'CPC moderado (R$ ' + c.cpc.toFixed(2) + ').' });
  } else if (c.cpc > 0 && c.cpc < 0.8) {
    recs.push({ type: 'success', icon: '✅', text: r ? r.lowCpc(c.cpc.toFixed(2)) : 'CPC eficiente (R$ ' + c.cpc.toFixed(2) + ').' });
  }

  if (c.cpm > 80) {
    recs.push({ type: 'warning', icon: '🎯', text: r ? r.highCpm(c.cpm.toFixed(2)) : 'CPM elevado (R$ ' + c.cpm.toFixed(2) + ').' });
  }

  if (c.frequency > 3.5) {
    recs.push({ type: 'danger', icon: '🔁', text: r ? r.highFreq(c.frequency.toFixed(1)) : 'Frequência alta (' + c.frequency.toFixed(1) + 'x). Público saturado.' });
  } else if (c.frequency > 2.5) {
    recs.push({ type: 'warning', icon: '🔁', text: r ? r.midFreq(c.frequency.toFixed(1)) : 'Frequência moderada (' + c.frequency.toFixed(1) + 'x).' });
  }

  if (c.objective && c.objective.includes('SALES')) {
    if (c.roas > 0 && c.roas < 1.5) {
      recs.push({ type: 'danger', icon: '📉', text: r ? r.lowRoas(c.roas.toFixed(2)) : 'ROAS abaixo do equilíbrio (' + c.roas.toFixed(2) + 'x).' });
    } else if (c.roas >= 1.5 && c.roas < 3) {
      recs.push({ type: 'warning', icon: '📈', text: r ? r.midRoas(c.roas.toFixed(2)) : 'ROAS moderado (' + c.roas.toFixed(2) + 'x).' });
    } else if (c.roas >= 3) {
      recs.push({ type: 'success', icon: '🚀', text: r ? r.highRoas(c.roas.toFixed(2)) : 'ROAS excelente (' + c.roas.toFixed(2) + 'x).' });
    } else if (c.purchases === 0 && c.spend > 50) {
      recs.push({ type: 'danger', icon: '❌', text: r ? r.noSales(c.spend.toFixed(2)) : 'Nenhuma venda com R$ ' + c.spend.toFixed(2) + ' investido.' });
    }
  }

  if (c.spend < 5 && c.impressions < 100) {
    recs.push({ type: 'info', icon: 'ℹ️', text: r ? r.lowData : 'Dados insuficientes.' });
  }

  if (c.objective && c.objective.includes('ENGAGEMENT') && c.cpm < 15 && c.ctr > 2) {
    recs.push({ type: 'success', icon: '❤️', text: 'Ótimo engajamento. Continue com este perfil de criativo.' });
  }

  if (recs.length === 0) {
    recs.push({ type: 'info', icon: 'ℹ️', text: r ? r.ok : 'Métricas dentro do padrão. Monitore regularmente.' });
  }

  return recs;
}

export function calcScore(c) {
  let score = 50;

  // CTR score (0-30 pts)
  if (c.ctr >= 3) score += 30;
  else if (c.ctr >= 2) score += 22;
  else if (c.ctr >= 1) score += 14;
  else if (c.ctr >= 0.5) score += 6;
  else score -= 10;

  // CPC score (0-20 pts)
  if (c.cpc > 0 && c.cpc < 1) score += 20;
  else if (c.cpc < 2) score += 12;
  else if (c.cpc < 4) score += 4;
  else score -= 10;

  // Frequency penalty (-20 to 0)
  if (c.frequency > 3.5) score -= 20;
  else if (c.frequency > 2.5) score -= 10;

  // ROAS bonus (0-20 pts)
  if (c.roas >= 3) score += 20;
  else if (c.roas >= 1.5) score += 10;
  else if (c.roas > 0 && c.roas < 1) score -= 10;

  return Math.max(0, Math.min(100, score));
}
