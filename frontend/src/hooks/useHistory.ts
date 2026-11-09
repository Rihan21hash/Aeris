import { useState, useEffect, useCallback } from 'react';
import { api, AqiExtremesData, AqiHistoryData } from '../services/api';

export function useHistory(locationId: number | null, range: '24h' | '7d') {
  const [history, setHistory] = useState<AqiHistoryData | null>(null);
  const [extremes, setExtremes] = useState<AqiExtremesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!locationId) {
      setHistory(null);
      setExtremes(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [histData, extData] = await Promise.all([
        api.getAqiHistory(locationId, range),
        api.getAqiExtremes(locationId, range),
      ]);
      setHistory(histData);
      setExtremes(extData);
    } catch (err: any) {
      console.error('Failed to load history data:', err);
      setError(err.message || 'Failed to load historical air quality records.');
    } finally {
      setIsLoading(false);
    }
  }, [locationId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { history, extremes, isLoading, error, refetch: fetchData };
}
