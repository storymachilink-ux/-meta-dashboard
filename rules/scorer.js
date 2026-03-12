// ============================================================
// rules/scorer.js
// Substitui calcScore de utils.js
// Score 0–100 com classificação acionável
// ============================================================

// ============================================================
// Dimensões de score (cada uma retorna 0–100)
// ============================================================
function scoreRoas(roas, config) {
  if (roas >= config.roas_scale_threshold)    return 100
  if (roas >= config.roas_maintain_threshold) return 80
  if (roas >= config.roas_warning_threshold)  return 55
  if (roas >= config.roas_critical_threshold) return 25
  return 0
}

function scoreCpa(cpa, spend) {
  // Sem CPA (sem compras): penaliza proporcionalmente ao spend
  if (!cpa || cpa === null) {
    if (spend < 30)  return 50  // pouco dado, neutro
    if (spend < 100) return 30
    return 10
  }
  // CPA bom = abaixo de R$50, ruim = acima de R$200
  if (cpa <= 30)  return 100
  if (cpa <= 50)  return 85
  if (cpa <= 100) return 65
  if (cpa <= 200) return 40
  return 15
}

function scoreCtr(ctr) {
  if (ctr >= 3.0) return 100
  if (ctr >= 2.0) return 85
  if (ctr >= 1.2) return 70
  if (ctr >= 0.8) return 50
  if (ctr >= 0.5) return 30
  return 10
}

function scoreFrequency(frequency) {
  if (frequency === 0) return 70   // sem dado, neutro
  if (frequency <= 1.5) return 100
  if (frequency <= 2.5) return 85
  if (frequency <= 3.5) return 60
  if (frequency <= 5.0) return 35
  return 10
}

function scoreStability(dailyHistory) {
  // Mede variação de ROAS nos últimos dias
  if (!dailyHistory || dailyHistory.length < 3) return 60  // sem histórico, neutro

  const roasValues = dailyHistory
    .filter(d => d.spend > 10)
    .map(d => d.roas || 0)

  if (roasValues.length < 2) return 60

  const avg = roasValues.reduce((s, v) => s + v, 0) / roasValues.length
  const variance = roasValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / roasValues.length
  const stdDev = Math.sqrt(variance)
  const cv = avg > 0 ? stdDev / avg : 1  // coeficiente de variação

  if (cv <= 0.15) return 100   // muito estável
  if (cv <= 0.30) return 80
  if (cv <= 0.50) return 60
  if (cv <= 0.75) return 40
  return 20
}

function scoreDataVolume(spend, days) {
  // Penaliza campanhas com pouco dado — score não é confiável
  if (spend >= 500 && days >= 7) return 100
  if (spend >= 200 && days >= 3) return 80
  if (spend >= 50  && days >= 2) return 60
  if (spend >= 20)               return 40
  return 20
}

// ============================================================
// Classificação baseada no score final
// ============================================================
function classify(score, config) {
  if (score >= config.score_scale_min) return 'scale'
  if (score >= 60)                     return 'maintain'
  if (score >= 45)                     return 'observe'
  if (score >= config.score_pause_max) return 'test_creative'
  return 'pause'
}

// ============================================================
// Score principal
// ============================================================
export function calcScore(campaign, dailyHistory = [], config = {}) {
  const cfg = {
    roas_scale_threshold:    config.roas_scale_threshold    ?? 2.0,
    roas_maintain_threshold: config.roas_maintain_threshold ?? 1.8,
    roas_warning_threshold:  config.roas_warning_threshold  ?? 1.5,
    roas_critical_threshold: config.roas_critical_threshold ?? 1.0,
    score_scale_min:         config.score_scale_min         ?? 75,
    score_pause_max:         config.score_pause_max         ?? 35,
  }

  const weights = {
    roas:       0.35,
    cpa:        0.20,
    ctr:        0.15,
    frequency:  0.15,
    stability:  0.10,
    dataVolume: 0.05,
  }

  const scores = {
    roas:       scoreRoas(campaign.roas || 0, cfg),
    cpa:        scoreCpa(campaign.cpa, campaign.spend || 0),
    ctr:        scoreCtr(campaign.ctr || 0),
    frequency:  scoreFrequency(campaign.frequency || 0),
    stability:  scoreStability(dailyHistory),
    dataVolume: scoreDataVolume(campaign.spend || 0, dailyHistory.length),
  }

  const final = Object.entries(weights).reduce((acc, [key, w]) => acc + scores[key] * w, 0)
  const score = Math.round(final)

  return {
    score,
    classification: classify(score, cfg),
    details: scores,
  }
}
