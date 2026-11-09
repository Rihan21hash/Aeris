import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, LocationSearchResult } from '../services/api';

export interface LocationState {
  latitude: number;
  longitude: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  locationId: number | null;
}

interface LocationContextType {
  location: LocationState;
  isLoading: boolean;
  error: string | null;
  setLocation: (loc: Partial<LocationState> & { latitude: number; longitude: number; name: string }) => void;
  detectLocation: () => void;
  selectSearchResult: (res: LocationSearchResult) => void;
}

// Default fallback location (New Delhi, India or London)
const DEFAULT_LOCATION: LocationState = {
  latitude: 28.6139,
  longitude: 77.2090,
  name: 'New Delhi',
  city: 'New Delhi',
  state: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  locationId: null,
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<LocationState>(() => {
    const saved = localStorage.getItem('aeris_last_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return DEFAULT_LOCATION;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saveLocationToStorage = (loc: LocationState) => {
    localStorage.setItem('aeris_last_location', JSON.stringify(loc));
  };

  const setLocation = (loc: Partial<LocationState> & { latitude: number; longitude: number; name: string }) => {
    const updated: LocationState = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: loc.name,
      city: loc.city || null,
      state: loc.state || null,
      country: loc.country || null,
      countryCode: loc.countryCode || null,
      locationId: loc.locationId || null,
    };
    setLocationState(updated);
    saveLocationToStorage(updated);
    setError(null);
  };

  const selectSearchResult = (res: LocationSearchResult) => {
    setLocation({
      latitude: res.latitude,
      longitude: res.longitude,
      name: res.name || res.city || res.display_name.split(',')[0],
      city: res.city,
      state: res.state,
      country: res.country,
      countryCode: res.country_code?.toUpperCase() || null,
    });
  };

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Fetch reverse geocoding via our backend current endpoint which creates the location
          const aqiData = await api.getCurrentAqi(latitude, longitude);
          const detectedLoc: LocationState = {
            latitude,
            longitude,
            name: aqiData.location_name || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
            city: null,
            state: null,
            country: null,
            countryCode: aqiData.aqi_standard === 'cpcb_naqi' ? 'IN' : null,
            locationId: aqiData.location_id,
          };
          setLocationState(detectedLoc);
          saveLocationToStorage(detectedLoc);
        } catch {
          // If network error, still save coordinates
          setLocation({
            latitude,
            longitude,
            name: `Coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
          });
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setIsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. You can search for your city above.');
        } else {
          setError('Could not detect your current location. Please search manually.');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    // Only detect if no location was previously saved in storage
    const saved = localStorage.getItem('aeris_last_location');
    if (!saved) {
      detectLocation();
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        isLoading,
        error,
        setLocation,
        detectLocation,
        selectSearchResult,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

