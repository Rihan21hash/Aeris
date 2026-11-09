import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, AqiCurrentData, PollutantsData } from '../services/api';
import { useLocation } from './LocationContext';

interface AqiContextType {
  currentAqi: AqiCurrentData | null;
  pollutants: PollutantsData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  aqiStandard: 'us_epa' | 'cpcb_naqi';
  setAqiStandard: (standard: 'us_epa' | 'cpcb_naqi') => void;
  refreshAqi: () => Promise<void>;
}

const AqiContext = createContext<AqiContextType | undefined>(undefined);

export const AqiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location, setLocation } = useLocation();

  const [aqiStandard, setAqiStandardState] = useState<'us_epa' | 'cpcb_naqi'>(() => {
    const saved = localStorage.getItem('aeris_preferred_standard');
    if (saved === 'cpcb_naqi' || saved === 'us_epa') return saved;
    // Default to CPCB for India, US EPA for others
    return location.countryCode === 'IN' ? 'cpcb_naqi' : 'us_epa';
  });

  const [currentAqi, setCurrentAqi] = useState<AqiCurrentData | null>(null);
  const [pollutants, setPollutants] = useState<PollutantsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const setAqiStandard = (std: 'us_epa' | 'cpcb_naqi') => {
    setAqiStandardState(std);
    localStorage.setItem('aeris_preferred_standard', std);
  };

  const fetchAqiData = useCallback(async () => {
    if (!location.latitude || !location.longitude) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getCurrentAqi(location.latitude, location.longitude, aqiStandard);
      setCurrentAqi(data);
      if (data.pollutants) {
        setPollutants(data.pollutants);
      }
      setLastUpdated(new Date());

      // Update location ID if it was returned
      if (data.location_id && location.locationId !== data.location_id) {
        setLocation({
          ...location,
          locationId: data.location_id,
          name: data.location_name || location.name,
        });
      }
    } catch (err: any) {
      console.error('Failed to load current AQI:', err);
      setError(err.message || 'Unable to retrieve air quality data. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  }, [location.latitude, location.longitude, aqiStandard]);

  useEffect(() => {
    fetchAqiData();
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchAqiData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAqiData]);

  return (
    <AqiContext.Provider
      value={{
        currentAqi,
        pollutants,
        isLoading,
        error,
        lastUpdated,
        aqiStandard,
        setAqiStandard,
        refreshAqi: fetchAqiData,
      }}
    >
      {children}
    </AqiContext.Provider>
  );
};

export const useAqi = () => {
  const context = useContext(AqiContext);
  if (!context) {
    throw new Error('useAqi must be used within an AqiProvider');
  }
  return context;
};
