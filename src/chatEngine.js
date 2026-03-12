// Smart chat engine — all answers use the filtered period data
const R = (v, d = 2) => Number(v).toFixed(d);
const BRL = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = (v) => Number(v).toFixed(2) + '%';
const INT = (v) => Number(v).toLocaleString('pt-BR');

function label(days) {
  if (days <= 3) return `últimos ${days} dias`;
  if (days === 7) return `última semana`;
  if (days === 15) return `últimas 2 semanas`;
  if (days === 30) return `último mês`;
  if (days === 60) return `últimos 2 meses`;
  if (days === 90) return `últimos 3 meses`;
  return `últimos ${days} dias`;
}

function trendTag(v, good, bad) {
  if (v > good) return '🟢';
  if (v < bad) return '🔴';
  return '🟡';
}

// Detect intent from user query
function detectIntent(q) {
  const lower = q.toLowerCase().replace(/[áàãâä]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íì]/g, 'i').replace(/[óòõô]/g, 'o').replace(/[úù]/g, 'u').replace(/[ç]/g, 'c');

  if (lower.match(/roas/)) return 'roas';
  if (lower.match(/ctr|taxa.*clic|click.*rate/)) return 'ctr';
  if (lower.match(/cpc|custo.*clic|cost.*click/)) return 'cpc';
  if (lower.match(/cpm/)) return 'cpm';
  if (lower.match(/cpa|custo.*aquis|custo.*conversao|cost.*acquis/)) return 'cpa';
  if (lower.match(/frequen|saturat|repeti/)) return 'frequency';
  if (lower.match(/pausar|desativar|pausar|parar|stop|pause/)) return 'pause';
  if (lower.match(/escalar|aumentar.*orcamento|scale.*budget|budget.*increase/)) return 'scale';
  if (lower.match(/gasto|gastando|investindo|spending|investimento|orcamento/)) return 'spend';
  if (lower.match(/impressao|impressoes|impressions|alcance|reach/)) return 'reach';
  if (lower.match(/compra|conversao|venda|purchase|conversion|revenue|receita/)) return 'conversions';
  if (lower.match(/ticket.*medio|ticket|valor.*medio/)) return 'ticket';
  if (lower.match(/melhor.*campanha|top.*campan|best.*camp/)) return 'best_campaign';
  if (lower.match(/pior.*campanha|worst.*camp/)) return 'worst_campaign';
  if (lower.match(/criativo|anuncio|ad.*name|creative/)) return 'creatives';
  if (lower.match(/resumo|overview|geral|summary|como.*vai|como.*esta|situacao/)) return 'summary';
  if (lower.match(/otimizar|melhorar|improve|optimize|dica|sugestao|recomend/)) return 'optimize';
  if (lower.match(/conjunto|adset/)) return 'adsets';
  if (lower.match(/conta|account/)) return 'accounts';
  if (lower.match(/objetivo|objective/)) return 'objectives';
  return 'general';
}

export function buildAnswer(query, { filteredCampaigns, filteredDaily, summary, days, adsData, adsetsData }) {
  const intent = detectIntent(query);
  const per = label(days);
  const cs = filteredCampaigns.filter(c => c.impressions > 50 || c.spend > 5);
  const salesCs = cs.filter(c => c.objective?.includes('SALES'));

  const { totalSpend, totalImpressions, totalClicks, avgCTR, avgCPC, avgCPM,
    totalPurchases, totalRevenue, avgROAS, totalReach } = summary;

  // Helper: top N with rich info
  const top = (arr, sortFn, n = 3) => [...arr].sort(sortFn).slice(0, n);
  const campLine = (c, metric, fmt) => `  • **${c.name}** (${c.account}) — ${fmt(c[metric])}`;

  switch (intent) {
    case 'roas': {
      const ranked = top(salesCs.filter(c => c.roas > 0), (a, b) => b.roas - a.roas);
      const worst = top(salesCs.filter(c => c.roas > 0 && c.spend > 30), (a, b) => a.roas - b.roas);
      const profitable = salesCs.filter(c => c.roas >= 2).length;
      const atLoss = salesCs.filter(c => c.roas > 0 && c.roas < 1).length;
      return {
        icon: '📈',
        headline: `ROAS nos ${per}: **${R(avgROAS)}x** ${trendTag(avgROAS, 3, 1.5)}`,
        body: [
          `Analisando **${salesCs.length} campanhas de vendas** com **${BRL(totalSpend)}** investidos e **${BRL(totalRevenue)}** em receita.`,
          '',
          `🏆 **Top ROAS do período:**`,
          ...ranked.map(c => `  • **${c.name}** → ${R(c.roas)}x ROAS · ${BRL(c.spend)} investido · ${c.purchases || 0} compras`),
          '',
          ranked.length > 0 && `💡 **O que fazer:** "${ranked[0]?.name}" está performando bem com ${R(ranked[0]?.roas)}x. Se o CPA está dentro do esperado, considere aumentar o orçamento em 20–30% por vez.`,
          profitable > 0 && `✅ **${profitable} campanha(s)** com ROAS ≥ 2x (lucrativas).`,
          atLoss > 0 && `⚠️ **${atLoss} campanha(s)** com ROAS < 1x (operando no prejuízo):`,
          ...(atLoss > 0 ? worst.map(c => `  • **${c.name}** → ${R(c.roas)}x · pause ou revise a oferta`) : []),
        ].filter(Boolean),
      };
    }

    case 'ctr': {
      const withData = cs.filter(c => c.impressions > 200);
      const best = top(withData, (a, b) => b.ctr - a.ctr);
      const worst = top(withData.filter(c => c.spend > 15), (a, b) => a.ctr - b.ctr);
      const aboveAvg = withData.filter(c => c.ctr >= 2).length;
      const critical = withData.filter(c => c.ctr < 0.5).length;
      return {
        icon: '🎯',
        headline: `CTR médio nos ${per}: **${PCT(avgCTR)}** ${trendTag(avgCTR, 2, 0.8)}`,
        body: [
          `CTR mede quantas pessoas clicam ao ver seu anúncio. Acima de **2%** é excelente, abaixo de **0.5%** é crítico.`,
          '',
          `🏆 **Criativos com melhor CTR:**`,
          ...best.map(c => `  • **${c.name}** → ${PCT(c.ctr)} · ${INT(c.impressions)} imp.`),
          '',
          `⚠️ **Campanhas com CTR crítico (>R$15 gastos):**`,
          ...worst.map(c => `  • **${c.name}** → ${PCT(c.ctr)} · ${BRL(c.spend)} gastos`),
          '',
          `📊 **Situação:** ${aboveAvg} camp. com CTR ≥ 2% · ${critical} camp. com CTR < 0.5%.`,
          `💡 CTR baixo pode indicar criativo fraco, público errado ou headline sem gancho. Teste novos ângulos de copy.`,
        ],
      };
    }

    case 'cpc': {
      const best = top(cs.filter(c => c.cpc > 0 && c.clicks > 20), (a, b) => a.cpc - b.cpc);
      const expensive = top(cs.filter(c => c.cpc > 0 && c.spend > 20), (a, b) => b.cpc - a.cpc);
      return {
        icon: '🏷',
        headline: `CPC médio nos ${per}: **${BRL(avgCPC)}** ${trendTag(avgCPC, 0, 1) === '🟢' ? '🟢' : avgCPC < 2 ? '🟡' : '🔴'}`,
        body: [
          `Custo por clique: você pagou em média **${BRL(avgCPC)}** por cada clique — com **${INT(totalClicks)} cliques** no total.`,
          '',
          `💚 **CPC mais eficiente (menor custo):**`,
          ...best.map(c => `  • **${c.name}** → ${BRL(c.cpc)} por clique · ${INT(c.clicks)} cliques`),
          '',
          `🔴 **CPC mais alto (maior custo por clique):**`,
          ...expensive.map(c => `  • **${c.name}** → ${BRL(c.cpc)} · ${BRL(c.spend)} gastos`),
          '',
          `💡 **Para reduzir CPC:** melhore o CTR (anúncio mais relevante = lance menor), refine o público e teste copy com CTA mais claro.`,
        ],
      };
    }

    case 'frequency': {
      const highFreq = cs.filter(c => c.frequency > 2.5).sort((a, b) => b.frequency - a.frequency);
      const ok = cs.filter(c => c.frequency >= 1 && c.frequency <= 2).length;
      return {
        icon: '🔁',
        headline: `Frequência — ${highFreq.length} campanha(s) com saturação`,
        body: [
          `Frequência ideal: **1.5x a 2.5x**. Acima de 3x o público começa a ignorar ou se irritar com o anúncio.`,
          '',
          highFreq.length > 0
            ? `🔴 **Campanhas com frequência preocupante:**`
            : `✅ Todas as campanhas estão com frequência saudável.`,
          ...highFreq.slice(0, 5).map(c => {
            const status = c.frequency > 3.5 ? '🔴 CRÍTICO' : '🟡 ATENÇÃO';
            return `  • **${c.name}** → ${R(c.frequency, 1)}x ${status} · CTR: ${PCT(c.ctr)}`;
          }),
          '',
          highFreq.length > 0 && `💡 **Ações recomendadas para alta frequência:**\n  1. Crie variações do criativo (mesmo público, novo ângulo)\n  2. Expanda o público com Lookalike baseada em compradores\n  3. Reduza o orçamento para diminuir a velocidade de exposição`,
          ok > 0 && `✅ **${ok} campanhas** com frequência saudável (1.5x–2.5x).`,
        ].filter(Boolean),
      };
    }

    case 'pause': {
      const candidates = cs.filter(c => c.spend > 20).map(c => {
        let score = 0;
        if (c.ctr < 0.5) score += 3;
        else if (c.ctr < 1) score += 1;
        if (c.frequency > 3.5) score += 2;
        if (c.objective?.includes('SALES') && c.purchases === 0 && c.spend > 40) score += 3;
        if (c.roas > 0 && c.roas < 1) score += 2;
        return { ...c, pauseScore: score };
      }).filter(c => c.pauseScore >= 2).sort((a, b) => b.pauseScore - a.pauseScore);

      return {
        icon: '🛑',
        headline: `${candidates.length} campanha(s) candidatas a pausa`,
        body: [
          `Baseado nos dados dos ${per}, identifiquei campanhas com múltiplos sinais negativos:`,
          '',
          ...candidates.slice(0, 5).map(c => {
            const reasons = [];
            if (c.ctr < 0.5) reasons.push(`CTR crítico ${PCT(c.ctr)}`);
            if (c.frequency > 3.5) reasons.push(`frequência saturada ${R(c.frequency, 1)}x`);
            if (c.objective?.includes('SALES') && c.purchases === 0 && c.spend > 40) reasons.push(`zero vendas com ${BRL(c.spend)} gastos`);
            if (c.roas > 0 && c.roas < 1) reasons.push(`ROAS negativo ${R(c.roas)}x`);
            return `  • **${c.name}** — ${reasons.join(' · ')}`;
          }),
          '',
          candidates.length > 0
            ? `⚡ **Antes de pausar:** verifique se o pixel está disparando corretamente e se a landing page está funcionando. Em alguns casos, baixo ROAS é problema de funil, não do anúncio.`
            : `✅ Nenhuma campanha com critérios claros para pausa. Continue monitorando diariamente.`,
        ],
      };
    }

    case 'scale': {
      const candidates = salesCs.filter(c => c.roas >= 2 && c.ctr >= 1.5 && c.frequency < 3).sort((a, b) => b.roas - a.roas);
      return {
        icon: '🚀',
        headline: `${candidates.length} campanha(s) com potencial de escala`,
        body: [
          `Para escalar com segurança, uma campanha precisa de: ROAS ≥ 2x, CTR ≥ 1.5% e frequência < 3x.`,
          '',
          candidates.length > 0
            ? `✅ **Prontas para escalar:**`
            : `⚠️ Nenhuma campanha atende todos os critérios neste período.`,
          ...candidates.slice(0, 4).map(c => `  • **${c.name}** → ROAS ${R(c.roas)}x · CTR ${PCT(c.ctr)} · Freq. ${R(c.frequency, 1)}x`),
          '',
          candidates.length > 0 && `💡 **Como escalar:** aumente o orçamento em **20% a cada 3–4 dias**, não de uma vez. Monitore o CPA — se aumentar mais de 30%, reduza novamente.`,
        ].filter(Boolean),
      };
    }

    case 'spend': {
      const ranked = top(cs, (a, b) => b.spend - a.spend, 5);
      const byAccount = {};
      cs.forEach(c => { byAccount[c.account] = (byAccount[c.account] || 0) + c.spend; });
      const topAccount = Object.entries(byAccount).sort((a, b) => b[1] - a[1])[0];
      return {
        icon: '💰',
        headline: `Investimento nos ${per}: **${BRL(totalSpend)}**`,
        body: [
          `Total distribuído em **${cs.length} campanhas** com **${INT(totalImpressions)} impressões**.`,
          '',
          `🏦 **Maior concentração:** conta **${topAccount?.[0]}** com ${BRL(topAccount?.[1] || 0)}.`,
          '',
          `💸 **Top 5 por gasto:**`,
          ...ranked.map((c, i) => `  ${i + 1}. **${c.name}** → ${BRL(c.spend)} (${((c.spend / totalSpend) * 100).toFixed(1)}% do total)`),
          '',
          `📊 **Eficiência geral:** cada R$ 1,00 investido gerou ${R(totalClicks / (totalSpend || 1), 3)} cliques e ${R(totalImpressions / (totalSpend || 1), 0)} impressões.`,
        ],
      };
    }

    case 'conversions': {
      const topSales = top(salesCs.filter(c => c.purchases > 0), (a, b) => b.purchases - a.purchases, 5);
      const noSales = salesCs.filter(c => c.purchases === 0 && c.spend > 30);
      const avgTicket = totalPurchases > 0 && totalRevenue > 0 ? totalRevenue / totalPurchases : 0;
      return {
        icon: '🛒',
        headline: `Conversões nos ${per}: **${INT(totalPurchases)} compras** · ${BRL(totalRevenue)} receita`,
        body: [
          `ROAS médio: **${R(avgROAS)}x** · CPA médio: **${totalPurchases > 0 ? BRL(totalSpend / totalPurchases) : '--'}** · Ticket médio: **${avgTicket > 0 ? BRL(avgTicket) : '--'}**`,
          '',
          topSales.length > 0 && `🏆 **Campanhas que mais converteram:**`,
          ...topSales.map(c => `  • **${c.name}** → ${c.purchases} compras · ${BRL(c.spend)} investido · CPA ${BRL(c.spend / c.purchases)}`),
          '',
          noSales.length > 0 && `❌ **${noSales.length} campanha(s) de vendas sem nenhuma conversão** (com gasto > R$30):`,
          ...noSales.slice(0, 3).map(c => `  • **${c.name}** → ${BRL(c.spend)} sem retorno`),
          noSales.length > 0 && `\n  💡 Verifique: pixel de conversão ativo? Página de destino funcionando? Oferta clara?`,
        ].filter(Boolean),
      };
    }

    case 'cpa': {
      const cpas = salesCs.filter(c => c.purchases > 0).map(c => ({ ...c, cpa: c.spend / c.purchases })).sort((a, b) => a.cpa - b.cpa);
      const avgCPA = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
      return {
        icon: '🎯',
        headline: `CPA médio nos ${per}: **${avgCPA > 0 ? BRL(avgCPA) : '--'}**`,
        body: [
          `Custo de aquisição = quanto você paga por cada compra realizada.`,
          '',
          cpas.length > 0 && `💚 **Menor CPA (mais eficiente):**`,
          ...cpas.slice(0, 3).map(c => `  • **${c.name}** → CPA ${BRL(c.cpa)} · ${c.purchases} compras`),
          '',
          cpas.length > 3 && `🔴 **Maior CPA (menos eficiente):**`,
          ...(cpas.length > 3 ? cpas.slice(-3).reverse().map(c => `  • **${c.name}** → CPA ${BRL(c.cpa)} · ${BRL(c.spend)} gastos`) : []),
          '',
          `💡 **CPA ideal** depende do seu LTV (valor vitalício do cliente) e margem do produto. Como regra geral: CPA < 30% do valor do produto.`,
        ].filter(Boolean),
      };
    }

    case 'best_campaign': {
      const scored = cs.map(c => {
        let s = 0;
        s += Math.min(c.ctr, 5) * 6;
        s += c.roas > 0 ? Math.min(c.roas, 5) * 8 : 0;
        s += c.purchases * 2;
        s -= c.frequency > 3 ? 10 : 0;
        return { ...c, perf: s };
      }).sort((a, b) => b.perf - a.perf).slice(0, 3);
      return {
        icon: '🏅',
        headline: `Top 3 campanhas dos ${per}`,
        body: [
          `Pontuação baseada em CTR, ROAS, conversões e frequência.`,
          '',
          ...scored.map((c, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            return [
              `${medals[i]} **${c.name}**`,
              `   CTR ${PCT(c.ctr)} · CPC ${BRL(c.cpc)} · ROAS ${c.roas > 0 ? R(c.roas) + 'x' : '--'} · ${c.purchases || 0} compras`,
            ].join('\n');
          }),
          '',
          `💡 Estas campanhas merecem mais orçamento — especialmente se a frequência ainda está abaixo de 3x.`,
        ],
      };
    }

    case 'optimize': {
      const issues = [];
      const wins = [];
      if (avgCTR < 1) issues.push(`CTR baixo (${PCT(avgCTR)}) — testar novos criativos e headlines`);
      if (avgCPC > 3) issues.push(`CPC alto (${BRL(avgCPC)}) — refinar segmentação`);
      const highFreqCount = cs.filter(c => c.frequency > 3).length;
      if (highFreqCount > 0) issues.push(`${highFreqCount} campanha(s) com frequência alta — renovar criativos`);
      const zeroSales = salesCs.filter(c => c.purchases === 0 && c.spend > 30).length;
      if (zeroSales > 0) issues.push(`${zeroSales} campanha(s) de vendas sem conversão — verificar pixel e funil`);
      if (avgROAS >= 2) wins.push(`ROAS saudável (${R(avgROAS)}x)`);
      if (avgCTR >= 2) wins.push(`CTR acima da média (${PCT(avgCTR)})`);
      const goodCampaigns = salesCs.filter(c => c.roas >= 2 && c.ctr >= 1.5).length;
      if (goodCampaigns > 0) wins.push(`${goodCampaigns} campanhas com ROAS ≥ 2x prontas para escalar`);

      return {
        icon: '⚡',
        headline: `Plano de otimização — ${per}`,
        body: [
          wins.length > 0 && `✅ **O que está funcionando:**`,
          ...wins.map(w => `  • ${w}`),
          '',
          issues.length > 0 && `🔧 **O que melhorar (prioridade):**`,
          ...issues.map((iss, i) => `  ${i + 1}. ${iss}`),
          '',
          `📋 **Próximos passos:**\n  1. Pause campanhas com CTR < 0.5% e gasto > R$30\n  2. Aumente budget das campanhas com ROAS > 2x\n  3. Renove criativos em campanhas com frequência > 3x\n  4. Teste novos públicos Lookalike para campanhas rentáveis`,
        ].filter(Boolean),
      };
    }

    case 'accounts': {
      const byAcc = {};
      cs.forEach(c => {
        if (!byAcc[c.account]) byAcc[c.account] = { spend: 0, impressions: 0, clicks: 0, purchases: 0, roas_sum: 0, roas_count: 0, count: 0 };
        byAcc[c.account].spend += c.spend;
        byAcc[c.account].impressions += c.impressions;
        byAcc[c.account].clicks += c.clicks;
        byAcc[c.account].purchases += c.purchases;
        if (c.roas > 0) { byAcc[c.account].roas_sum += c.roas; byAcc[c.account].roas_count++; }
        byAcc[c.account].count++;
      });
      const sorted = Object.entries(byAcc).sort((a, b) => b[1].spend - a[1].spend);
      return {
        icon: '🏢',
        headline: `Performance por conta — ${per}`,
        body: [
          ...sorted.map(([name, a]) => {
            const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
            const roas = a.roas_count > 0 ? a.roas_sum / a.roas_count : 0;
            return `  • **${name}:** ${BRL(a.spend)} · ${a.count} camp. · CTR ${PCT(ctr)}${roas > 0 ? ` · ROAS ${R(roas)}x` : ''}`;
          }),
        ],
      };
    }

    case 'summary':
    default: {
      const noSalesCritical = salesCs.filter(c => c.purchases === 0 && c.spend > 40).length;
      const scalable = salesCs.filter(c => c.roas >= 2 && c.ctr >= 1.5).length;
      const urgent = cs.filter(c => c.frequency > 3.5 || (c.ctr < 0.5 && c.spend > 20)).length;

      return {
        icon: '📊',
        headline: `Resumo dos ${per}`,
        body: [
          `**${cs.length} campanhas** analisadas · **${BRL(totalSpend)}** investidos · **${INT(totalImpressions)}** impressões`,
          '',
          `| Métrica | Valor | Status |`,
          `|---------|-------|--------|`,
          `| Investimento | ${BRL(totalSpend)} | — |`,
          `| Impressões | ${INT(totalImpressions)} | — |`,
          `| Cliques | ${INT(totalClicks)} | — |`,
          `| CTR médio | ${PCT(avgCTR)} | ${trendTag(avgCTR, 2, 0.8)} |`,
          `| CPC médio | ${BRL(avgCPC)} | ${avgCPC < 2 ? '🟢' : avgCPC < 4 ? '🟡' : '🔴'} |`,
          `| Compras | ${INT(totalPurchases)} | — |`,
          `| ROAS médio | ${R(avgROAS)}x | ${trendTag(avgROAS, 3, 1.5)} |`,
          '',
          urgent > 0 && `🚨 **${urgent} campanha(s) precisam de ação imediata** (CTR crítico ou frequência alta).`,
          scalable > 0 && `🚀 **${scalable} campanha(s) prontas para escalar** (ROAS ≥ 2x).`,
          noSalesCritical > 0 && `❌ **${noSalesCritical} campanha(s) de vendas sem retorno** — revisar urgente.`,
          '',
          `💬 Pergunte algo mais específico: "quais campanhas pausar?", "como melhorar meu CTR?", "qual o meu melhor criativo?"`,
        ].filter(Boolean),
      };
    }
  }
}
