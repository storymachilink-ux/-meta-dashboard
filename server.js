import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'

import { runBackfill, runIncremental, runHourly } from './jobs/ingest.js'
import { runRulesForAllAccounts }                 from './rules/engine.js'
import { handleCampaigns }       from './src/api/campaigns.js'
import { handleDaily }           from './src/api/daily.js'
import { handleHourly }          from './src/api/hourly.js'
import { handleGetAlerts, handlePatchAlert } from './src/api/alerts.js'
import { handleRecommendations } from './src/api/recommendations.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================================
// Config
// ============================================================
let TOKEN       = process.env.META_TOKEN
const BASE      = 'https://graph.facebook.com/v21.0'
const PORT      = process.env.PORT || 3000
const TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'

// ============================================================
// Supabase client (service_role — ignora RLS, só backend)
// ============================================================
let supabase = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  console.log('[Supabase] Client inicializado')
} else {
  console.warn('[Supabase] Vars não definidas — modo sem banco (apenas realtime)')
}

// ============================================================
// Contas Meta
// ============================================================
const ACCOUNTS = [
  { id: 'act_658261130272983',    name: 'Arcanjo Miguel' },
  { id: 'act_1068752855298767',   name: 'Arcanjo Editr' },
  { id: 'act_1586662202021021',   name: 'Andreia Muller' },
  { id: 'act_26307470372223756',  name: 'BM ADSLY01' },
]

// ============================================================
// Cache em memória para /api/insights (TTL 4 min)
// ============================================================
const cache     = {}
const CACHE_TTL = 4 * 60 * 1000

// ============================================================
// Helpers Meta API (realtime — mantidos para /api/insights)
// ============================================================
async function fetchAllPages(url) {
  const rows  = []
  let next    = url
  let pages   = 0
  while (next && pages < 20) {
    const res = await fetch(next)
    const j   = await res.json()
    if (j.error) throw new Error(`Meta API: ${j.error.message}`)
    if (j.data) rows.push(...j.data)
    next = j.paging?.next || null
    pages++
  }
  return rows
}

function val(arr, type) {
  return parseFloat((arr || []).find(a => a.action_type === type)?.value || '0')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function fetchAccount(acc, since, until) {
  const fields = [
    'campaign_id','campaign_name','impressions','clicks','spend',
    'reach','frequency','cpc','cpm','ctr','unique_clicks',
    'actions','action_values','date_start','date_stop',
  ].join(',')

  const tr = encodeURIComponent(JSON.stringify({ since, until }))
  const q  = `level=campaign&time_range=${tr}&limit=500&access_token=${TOKEN}`

  const [aggRows, dailyRows, campRows] = await Promise.all([
    fetchAllPages(`${BASE}/${acc.id}/insights?fields=${fields}&${q}`),
    fetchAllPages(`${BASE}/${acc.id}/insights?fields=${fields}&time_increment=1&${q}`),
    fetchAllPages(`${BASE}/${acc.id}/campaigns?fields=id,name,objective,status,effective_status,start_time,stop_time&limit=500&access_token=${TOKEN}`),
  ])

  const campMap = {}
  campRows.forEach(c => { campMap[c.id] = c })

  const campaigns = aggRows.map(d => {
    const info      = campMap[d.campaign_id] || {}
    const spend     = parseFloat(d.spend || 0)
    const purchases = val(d.actions, 'purchase')
    const revenue   = val(d.action_values, 'purchase')
    return {
      id:               d.campaign_id,
      name:             d.campaign_name,
      account:          acc.name,
      account_id:       acc.id,
      impressions:      parseInt(d.impressions || 0),
      clicks:           parseInt(d.clicks || 0),
      spend,
      reach:            parseInt(d.reach || 0),
      frequency:        parseFloat(d.frequency || 0),
      cpc:              parseFloat(d.cpc || 0),
      cpm:              parseFloat(d.cpm || 0),
      ctr:              parseFloat(d.ctr || 0),
      unique_clicks:    parseInt(d.unique_clicks || 0),
      link_clicks:      val(d.actions, 'link_click'),
      page_engagement:  val(d.actions, 'page_engagement'),
      video_views:      val(d.actions, 'video_view'),
      purchases,
      revenue,
      roas:             spend > 0 ? revenue / spend : 0,
      cpa_purchase:     purchases > 0 ? spend / purchases : null,
      date_start:       info.start_time?.slice(0, 10) || d.date_start,
      date_stop:        info.stop_time?.slice(0, 10) || null,
      objective:        info.objective || '',
      status:           info.status || '',
      effective_status: info.effective_status || '',
      _live:            true,
    }
  })

  const daily = dailyRows.map(d => ({
    date:          d.date_start,
    campaign_id:   d.campaign_id,
    campaign_name: d.campaign_name,
    account:       acc.name,
    account_id:    acc.id,
    spend:         parseFloat(d.spend || 0),
    impressions:   parseInt(d.impressions || 0),
    clicks:        parseInt(d.clicks || 0),
    ctr:           parseFloat(d.ctr || 0),
    cpc:           parseFloat(d.cpc || 0),
    cpm:           parseFloat(d.cpm || 0),
    purchases:     val(d.actions, 'purchase'),
    revenue:       val(d.action_values, 'purchase'),
  }))

  return { campaigns, daily }
}

// ============================================================
// App Express
// ============================================================
const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, 'dist')))

// ============================================================
// POST /api/admin/token — atualiza token em memória sem redeploy
// Uso: curl -X POST https://...onrender.com/api/admin/token -H "Content-Type: application/json" -d '{"token":"SEU_TOKEN"}'
// ============================================================
app.post('/api/admin/token', (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'token é obrigatório' })
  TOKEN = token
  console.log('[admin] META_TOKEN atualizado em memória')
  res.json({ status: 'ok', preview: token.slice(0, 20) + '...' })
})

// ============================================================
// GET /api/health
// ============================================================
app.get('/api/health', async (req, res) => {
  const status = {
    server:     'ok',
    version:    '1.0.0',
    timestamp:  new Date().toISOString(),
    meta_token: TOKEN ? 'configured' : 'missing',
    supabase:   'not_configured',
  }

  if (supabase) {
    try {
      const { error } = await supabase.from('tenants').select('id').limit(1)
      status.supabase = error ? `error: ${error.message}` : 'ok'
    } catch (e) {
      status.supabase = `error: ${e.message}`
    }
  }

  res.status(200).json(status)
})

// ============================================================
// GET /api/insights — realtime (compatibilidade com frontend atual)
// ============================================================
app.get('/api/insights', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  try {
    if (!TOKEN) throw new Error('META_TOKEN environment variable not set')

    const td    = today()
    const since = req.query.since || (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10)
    })()
    const until = req.query.until || td

    const key = `${since}__${until}`
    const hit = cache[key]
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      return res.json({ ...hit.data, _cached: true })
    }

    console.log(`[Meta API] Fetching ${since} → ${until} para ${ACCOUNTS.length} contas...`)
    const results = await Promise.all(ACCOUNTS.map(acc => fetchAccount(acc, since, until)))

    const data = {
      campaigns: results.flatMap(r => r.campaigns),
      daily:     results.flatMap(r => r.daily),
      since,
      until,
      fetchedAt: new Date().toISOString(),
    }
    cache[key] = { data, ts: Date.now() }
    console.log(`[Meta API] Done: ${data.campaigns.length} campanhas, ${data.daily.length} linhas diárias`)
    res.json(data)
  } catch (err) {
    console.error('[Meta API error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /api/sync/backfill
// Dispara backfill manual (90 dias, todos os níveis)
// Responde imediatamente — processo roda em background
// ============================================================
app.post('/api/sync/backfill', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  if (!TOKEN)    return res.status(503).json({ error: 'META_TOKEN não configurado' })

  const daysBack = parseInt(req.query.days) || 90
  res.json({ status: 'started', mode: 'backfill', days: daysBack, accounts: ACCOUNTS.length })

  runBackfill(supabase, ACCOUNTS, TOKEN, TENANT_ID, daysBack)
    .then(r => console.log('[sync] Backfill finalizado:', r))
    .catch(e => console.error('[sync] Backfill erro:', e.message))
})

// ============================================================
// POST /api/sync/incremental
// Dispara sync incremental manual (últimos 3 dias)
// ============================================================
app.post('/api/sync/incremental', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  if (!TOKEN)    return res.status(503).json({ error: 'META_TOKEN não configurado' })

  res.json({ status: 'started', mode: 'incremental', accounts: ACCOUNTS.length })

  runIncremental(supabase, ACCOUNTS, TOKEN, TENANT_ID)
    .then(r => console.log('[sync] Incremental finalizado:', r))
    .catch(e => console.error('[sync] Incremental erro:', e.message))
})

// ============================================================
// POST /api/sync/hourly
// Dispara sync horário manual (?date=YYYY-MM-DD, padrão: ontem)
// ============================================================
app.post('/api/sync/hourly', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  if (!TOKEN)    return res.status(503).json({ error: 'META_TOKEN não configurado' })

  const date = req.query.date || null
  res.json({ status: 'started', mode: 'hourly', date: date || 'yesterday' })

  runHourly(supabase, ACCOUNTS, TOKEN, TENANT_ID, date || undefined)
    .then(r => console.log('[sync] Hourly finalizado:', r))
    .catch(e => console.error('[sync] Hourly erro:', e.message))
})

// ============================================================
// GET /api/campaigns — campanhas agregadas do período (banco)
// ============================================================
app.get('/api/campaigns', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handleCampaigns(req, res, supabase, TENANT_ID)
})

// ============================================================
// GET /api/daily — série temporal diária (banco)
// ============================================================
app.get('/api/daily', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handleDaily(req, res, supabase, TENANT_ID)
})

// ============================================================
// GET /api/hourly — dados horários (banco)
// ============================================================
app.get('/api/hourly', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handleHourly(req, res, supabase, TENANT_ID)
})

// ============================================================
// GET  /api/alerts — alertas ativos
// PATCH /api/alerts/:id — marcar lido/dismissado
// ============================================================
app.get('/api/alerts', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handleGetAlerts(req, res, supabase, TENANT_ID)
})

app.patch('/api/alerts/:id', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handlePatchAlert(req, res, supabase, TENANT_ID)
})

// ============================================================
// GET /api/recommendations — recomendações ativas
// ============================================================
app.get('/api/recommendations', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })
  handleRecommendations(req, res, supabase, TENANT_ID)
})

// ============================================================
// POST /api/sync/rules
// Dispara motor de regras manualmente
// ============================================================
app.post('/api/sync/rules', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })

  res.json({ status: 'started', mode: 'rules', accounts: ACCOUNTS.length })

  runRulesForAllAccounts(supabase, ACCOUNTS, TENANT_ID)
    .then(r => console.log('[sync] Rules finalizado:', r))
    .catch(e => console.error('[sync] Rules erro:', e.message))
})

// ============================================================
// GET /api/sync/status
// Últimos 20 logs de sync
// ============================================================
app.get('/api/sync/status', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase não configurado' })

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ============================================================
// SPA fallback
// ============================================================
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// ============================================================
// Cron jobs (só se Supabase + Meta Token estiverem configurados)
// ============================================================
if (supabase && TOKEN) {
  // Incremental + Rules: a cada 6 horas (0h, 6h, 12h, 18h)
  cron.schedule('0 0,6,12,18 * * *', async () => {
    console.log('[cron] Iniciando sync incremental + rules...')
    try {
      await runIncremental(supabase, ACCOUNTS, TOKEN, TENANT_ID)
      await runRulesForAllAccounts(supabase, ACCOUNTS, TENANT_ID)
      console.log('[cron] Incremental + Rules concluídos')
    } catch (e) {
      console.error('[cron] Erro:', e.message)
    }
  })

  // Hourly: todos os dias às 2h (fecha dados do dia anterior)
  cron.schedule('0 2 * * *', () => {
    console.log('[cron] Iniciando sync hourly...')
    runHourly(supabase, ACCOUNTS, TOKEN, TENANT_ID)
      .then(r => console.log('[cron] Hourly:', r))
      .catch(e => console.error('[cron] Hourly erro:', e.message))
  })

  console.log('[cron] Jobs agendados: incremental (0h/6h/12h/18h), hourly (2h diário)')
}

// ============================================================
// Start
// ============================================================
app.listen(PORT, () => {
  console.log(`[Server] Porta ${PORT}`)
  console.log(`[Server] Supabase: ${supabase ? 'conectado' : 'não configurado'}`)
  console.log(`[Server] Meta Token: ${TOKEN ? 'ok' : 'AUSENTE'}`)
})

export { supabase, ACCOUNTS, TENANT_ID }
