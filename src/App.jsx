import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { campaigns as staticCampaigns } from './campaignData.js';
import { dailyData as staticDailyData } from './dailyData.js';
import { adsData } from './adsData.js';
import { adsetsData } from './adsetsData.js';
import { translations } from './i18n.js';
import { buildAnswer } from './chatEngine.js';
import { useAlerts } from './hooks/useAlerts.js';
import { useRecommendations } from './hooks/useRecommendations.js';
import { triggerIncremental, triggerRules } from './lib/api.js';
import { AppCtx } from './AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import SearchBar from './components/SearchBar.jsx';
import Overview from './components/Overview.jsx';
import CampaignTable from './components/CampaignTable.jsx';
import CampaignDetail from './components/CampaignDetail.jsx';
import TimeSeriesChart from './components/TimeSeriesChart.jsx';
import ConversionsPage from './components/ConversionsPage.jsx';
import AlertsPage from './components/AlertsPage.jsx';


const DAY_PRESETS = [3, 5, 7, 12, 15, 20, 30, 60, 90];

export default function App() {
  const [lang, setLang] = useState('pt');
  const [tab, setTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
  });
  const [days, setDays] = useState(30);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [objectiveFilter, setObjectiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [dateMode, setDateMode] = useState('relative');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Live data state
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Alertas do banco (Sprint 4)
  const alertsHook = useAlerts({ autoRefresh: true });
  const recsHook = useRecommendations();

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  const TODAY = new Date().toISOString().slice(0, 10);
  const t = translations[lang];

  const togglePin = (id) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Date cutoff
  const cutoffDate = useMemo(() => {
    if (dateMode === 'custom' && customDateStart) return customDateStart;
    if (days === 1) return TODAY;
    const d = new Date(TODAY);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [dateMode, customDateStart, days, TODAY]);

  const endDate = useMemo(() => {
    if (dateMode === 'custom' && customDateEnd) return customDateEnd;
    return TODAY;
  }, [dateMode, customDateEnd, TODAY]);

  const effectiveDays = useMemo(() => {
    if (dateMode === 'custom' && customDateStart && customDateEnd) {
      return Math.max(1, Math.round((new Date(customDateEnd) - new Date(customDateStart)) / 86400000) + 1);
    }
    return days;
  }, [dateMode, customDateStart, customDateEnd, days]);

  // Fetch live data from Meta API
  const fetchLive = useCallback(async (since, until) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights?since=${since}&until=${until}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLiveData(data);
      setLastUpdated(new Date());
      setSelectedCampaign(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive(cutoffDate, endDate);
  }, [cutoffDate, endDate, fetchLive]);

  // Sync manual trigger — definido APÓS cutoffDate, endDate e fetchLive
  const [syncing, setSyncing] = useState(false);
  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await triggerIncremental();
      await triggerRules();
      setTimeout(() => {
        alertsHook.reload();
        recsHook.reload();
        fetchLive(cutoffDate, endDate);
      }, 8000);
    } catch {} finally {
      setTimeout(() => setSyncing(false), 8000);
    }
  }, [alertsHook, recsHook, cutoffDate, endDate, fetchLive]);

  const allCampaigns = liveData?.campaigns || staticCampaigns;
  const allDailyData = liveData?.daily || staticDailyData;

  const filteredDaily = useMemo(() => {
    return allDailyData.filter(d => {
      if (d.date < cutoffDate || d.date > endDate) return false;
      if (selectedAccount !== 'all' && d.account !== selectedAccount) return false;
      return true;
    });
  }, [allDailyData, cutoffDate, endDate, selectedAccount]);

  const periodMetrics = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      if (!map[d.campaign_id]) map[d.campaign_id] = { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
      const m = map[d.campaign_id];
      m.spend += d.spend;
      m.impressions += d.impressions;
      m.clicks += d.clicks;
      m.purchases += d.purchases;
      m.revenue += (d.revenue || 0);
    });
    Object.values(map).forEach(m => {
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
      m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
      m.roas = m.spend > 0 ? m.revenue / m.spend : 0;
    });
    return map;
  }, [filteredDaily]);

  const enrichedCampaigns = useMemo(() => {
    return allCampaigns
      .filter(c => selectedAccount === 'all' || c.account === selectedAccount)
      .map(c => {
        if (liveData) return { ...c, _period: true, _live: true };
        const pm = periodMetrics[c.id];
        if (pm && pm.spend > 0) {
          return { ...c, spend: pm.spend, impressions: pm.impressions, clicks: pm.clicks,
            purchases: pm.purchases, ctr: pm.ctr, cpc: pm.cpc, cpm: pm.cpm, roas: pm.roas,
            _period: true };
        }
        return { ...c, _period: false };
      });
  }, [allCampaigns, periodMetrics, liveData, selectedAccount]);

  const filteredCampaigns = useMemo(() => {
    return enrichedCampaigns.filter(c => {
      if (objectiveFilter !== 'all' && (c.objective || '') !== objectiveFilter) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (showPinnedOnly && !pinnedIds.has(c.id)) return false;
      return true;
    });
  }, [enrichedCampaigns, objectiveFilter, searchQuery, showPinnedOnly, pinnedIds]);

  const summary = useMemo(() => {
    const cs = filteredCampaigns;
    const totalSpend = cs.reduce((s, c) => s + c.spend, 0);
    const totalImpressions = cs.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = cs.reduce((s, c) => s + c.clicks, 0);
    const totalPurchases = cs.reduce((s, c) => s + c.purchases, 0);
    const totalRevenue = cs.reduce((s, c) => s + (c.revenue || 0), 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalReach = cs.reduce((s, c) => s + (c.reach || 0), 0);
    const totalEngagement = cs.reduce((s, c) => s + (c.page_engagement || 0), 0);
    return { totalSpend, totalImpressions, totalClicks, totalPurchases, totalRevenue,
      avgCTR, avgCPC, avgCPM, avgROAS, totalReach, totalEngagement };
  }, [filteredCampaigns]);

  const objectives = useMemo(() => {
    return [...new Set(allCampaigns.map(c => c.objective).filter(Boolean))];
  }, [allCampaigns]);

  const handleAsk = (query) => {
    const answer = buildAnswer(query, { filteredCampaigns, filteredDaily, summary, days: effectiveDays, adsData, adsetsData });
    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: query },
      { role: 'ai', ...answer },
    ]);
  };

  const ctx = {
    lang, t, days, setDays, selectedAccount, setSelectedAccount,
    objectiveFilter, setObjectiveFilter, searchQuery, setSearchQuery,
    pinnedIds, togglePin, showPinnedOnly, setShowPinnedOnly,
    filteredCampaigns, filteredDaily, summary, objectives,
    allCampaigns: enrichedCampaigns,
    cutoffDate, endDate, sidebarCollapsed,
    chatHistory, setChatHistory, handleAsk,
    periodMetrics,
    dateMode, setDateMode,
    customDateStart, setCustomDateStart,
    customDateEnd, setCustomDateEnd,
    effectiveDays, TODAY,
    DAY_PRESETS,
    loading, error, lastUpdated,
    refreshData: () => fetchLive(cutoffDate, endDate),
    isLive: !!liveData,
    // Alertas do banco
    alerts:        alertsHook.alerts,
    alertsSummary: alertsHook.summary,
    alertsLoading: alertsHook.loading,
    unreadAlerts:  alertsHook.unreadCount,
    criticalAlerts: alertsHook.criticalCount,
    dismissAlert:  alertsHook.dismiss,
    reloadAlerts:  alertsHook.reload,
    // Recomendações do banco
    recommendations:  recsHook.recommendations,
    recsLoading:      recsHook.loading,
    scaleRecs:        recsHook.scaleRecs,
    pauseRecs:        recsHook.pauseRecs,
    reviewRecs:       recsHook.reviewRecs,
    testRecs:         recsHook.testRecs,
    reloadRecs:       recsHook.reload,
    // Sync manual
    syncing, triggerSync,
    // Theme
    darkMode, setDarkMode,
  };

  const mainPad = sidebarCollapsed ? '72px' : '240px';

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', transition: 'background var(--t-slow)' }}>
        <Sidebar tab={tab} setTab={setTab} collapsed={sidebarCollapsed}
          toggleCollapse={() => setSidebarCollapsed(p => !p)}
          setSelectedCampaign={setSelectedCampaign}
          alertCount={alertsHook.criticalCount} />
        <div style={{ flex: 1, marginLeft: mainPad, transition: 'margin-left 0.25s', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <TopBar lang={lang} setLang={setLang} tab={tab}
            selectedCampaign={selectedCampaign} setSelectedCampaign={setSelectedCampaign} />

          {loading && (
            <div style={{ background: 'var(--info-soft)', borderBottom: '1px solid var(--accent-border)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--accent)' }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--accent-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Buscando dados ao vivo na Meta API...
            </div>
          )}
          {error && (
            <div style={{ background: 'var(--danger-soft)', borderBottom: '1px solid var(--danger)', padding: '10px 28px', fontSize: '13px', color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ Erro ao buscar dados: {error}</span>
              <button onClick={() => fetchLive(cutoffDate, endDate)} style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)' }}>Tentar novamente</button>
            </div>
          )}

          <main style={{ flex: 1, padding: '24px', maxWidth: '1480px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {!selectedCampaign && tab !== 'alerts' && (tab === 'overview' || tab === 'campaigns' || tab === 'charts' || tab === 'conversions') && (
              <SearchBar />
            )}
            {selectedCampaign ? (
              <CampaignDetail campaign={selectedCampaign} onBack={() => setSelectedCampaign(null)} />
            ) : tab === 'overview' ? (
              <Overview onSelectCampaign={setSelectedCampaign} />
            ) : tab === 'campaigns' ? (
              <CampaignTable onSelectCampaign={setSelectedCampaign} />
            ) : tab === 'charts' ? (
              <TimeSeriesChart />
            ) : tab === 'conversions' ? (
              <ConversionsPage onSelectCampaign={setSelectedCampaign} />
            ) : tab === 'alerts' ? (
              <AlertsPage />
            ) : (
              <ComingSoon tab={tab} t={t} />
            )}
          </main>
        </div>
      </div>
    </AppCtx.Provider>
  );
}

function ComingSoon({ tab, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>🚧</div>
      <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: 700 }}>{t.nav?.[tab] || tab}</div>
      <div style={{ fontSize: '14px', color: '#64748b' }}>Em breve / Coming soon</div>
    </div>
  );
}
