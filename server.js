import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const TOKEN = process.env.META_TOKEN
const BASE = 'https://graph.facebook.com/v21.0'

const ACCOUNTS = [
  { id: 'act_658261130272983',    name: 'Arcanjo Miguel' },
  { id: 'act_1068752855298767',   name: 'Arcanjo Editr' },
  { id: 'act_1586662202021021',   name: 'Andreia Muller' },
  { id: 'act_26307470372223756',  name: 'BM ADSLY01' },
]

const cache = {}
const CACHE_TTL = 4 * 60 * 1000 // 4 min

async function fetchAllPages(url) {
  const rows = []
  let next = url
  let pages = 0
  while (next && pages < 20) {
    const res = await fetch(next)
    const j = await res.json()
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
  const q = `level=campaign&time_range=${tr}&limit=500&access_token=${TOKEN}`

  const [aggRows, dailyRows, campRows] = await Promise.all([
    fetchAllPages(`${BASE}/${acc.id}/insights?fields=${fields}&${q}`),
    fetchAllPages(`${BASE}/${acc.id}/insights?fields=${fields}&time_increment=1&${q}`),
    fetchAllPages(`${BASE}/${acc.id}/campaigns?fields=id,name,objective,status,effective_status,start_time,stop_time&limit=500&access_token=${TOKEN}`),
  ])

  const campMap = {}
  campRows.forEach(c => { campMap[c.id] = c })

  const campaigns = aggRows.map(d => {
    const info = campMap[d.campaign_id] || {}
    const spend = parseFloat(d.spend || 0)
    const purchases = val(d.actions, 'purchase')
    const revenue = val(d.action_values, 'purchase')
    return {
      id: d.campaign_id,
      name: d.campaign_name,
      account: acc.name,
      account_id: acc.id,
      impressions: parseInt(d.impressions || 0),
      clicks: parseInt(d.clicks || 0),
      spend,
      reach: parseInt(d.reach || 0),
      frequency: parseFloat(d.frequency || 0),
      cpc: parseFloat(d.cpc || 0),
      cpm: parseFloat(d.cpm || 0),
      ctr: parseFloat(d.ctr || 0),
      unique_clicks: parseInt(d.unique_clicks || 0),
      link_clicks: val(d.actions, 'link_click'),
      page_engagement: val(d.actions, 'page_engagement'),
      video_views: val(d.actions, 'video_view'),
      purchases,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      cpa_purchase: purchases > 0 ? spend / purchases : null,
      date_start: info.start_time?.slice(0, 10) || d.date_start,
      date_stop: info.stop_time?.slice(0, 10) || null,
      objective: info.objective || '',
      status: info.status || '',
      effective_status: info.effective_status || '',
      _live: true,
    }
  })

  const daily = dailyRows.map(d => ({
    date: d.date_start,
    campaign_id: d.campaign_id,
    campaign_name: d.campaign_name,
    account: acc.name,
    account_id: acc.id,
    spend: parseFloat(d.spend || 0),
    impressions: parseInt(d.impressions || 0),
    clicks: parseInt(d.clicks || 0),
    ctr: parseFloat(d.ctr || 0),
    cpc: parseFloat(d.cpc || 0),
    cpm: parseFloat(d.cpm || 0),
    purchases: val(d.actions, 'purchase'),
    revenue: val(d.action_values, 'purchase'),
  }))

  return { campaigns, daily }
}

const app = express()

// Serve React build
app.use(express.static(join(__dirname, 'dist')))

// API endpoint
app.get('/api/insights', async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  try {
    if (!TOKEN) throw new Error('META_TOKEN environment variable not set')

    const td = today()
    const since = req.query.since || (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10)
    })()
    const until = req.query.until || td

    const key = `${since}__${until}`
    const hit = cache[key]
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      return res.json({ ...hit.data, _cached: true })
    }

    console.log(`[Meta API] Fetching ${since} → ${until} for ${ACCOUNTS.length} accounts...`)
    const results = await Promise.all(ACCOUNTS.map(acc => fetchAccount(acc, since, until)))

    const data = {
      campaigns: results.flatMap(r => r.campaigns),
      daily: results.flatMap(r => r.daily),
      since, until,
      fetchedAt: new Date().toISOString(),
    }
    cache[key] = { data, ts: Date.now() }
    console.log(`[Meta API] Done: ${data.campaigns.length} campaigns, ${data.daily.length} daily rows`)
    res.json(data)
  } catch (err) {
    console.error('[Meta API error]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// SPA fallback — serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
