import { useState, useEffect, useCallback } from 'react';
import { fetchRecommendations } from '../lib/api.js';

export function useRecommendations({ limit = 50 } = {}) {
  const [recommendations, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchRecommendations({ limit });
      setRecs(d.recommendations || []);
    } catch {
      setRecs([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  const scaleRecs   = recommendations.filter(r => r.action === 'scale');
  const pauseRecs   = recommendations.filter(r => r.action === 'pause');
  const reviewRecs  = recommendations.filter(r => r.action === 'review' || r.action === 'observe');
  const testRecs    = recommendations.filter(r => r.action === 'test_creative');

  return { recommendations, loading, reload: load, scaleRecs, pauseRecs, reviewRecs, testRecs };
}
