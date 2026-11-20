import React, { useState, useEffect } from 'react';
import { LocationSearch } from '../components/Search/LocationSearch';
import { AqiMap } from '../components/Map/AqiMap';
import { AqiCard } from '../components/AqiCard/AqiCard';
import { useLocation } from '../contexts/LocationContext';
import { useAqi } from '../contexts/AqiContext';
import { api, MonitoringStation, LocationSearchResult } from '../services/api';
import { History, Radio } from 'lucide-react';

export const Explore: React.FC = () => {
  const { location, selectSearchResult } = useLocation();
  const { currentAqi, isLoading: isAqiLoading } = useAqi();

  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<MonitoringStation | null>(null);
  const [recentSearches, setRecentSearches] = useState<LocationSearchResult[]>(() => {
    try {
      const saved = localStorage.getItem('aeris_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch real monitoring stations from OpenAQ v3
  useEffect(() => {
    if (!location.latitude || !location.longitude) return;

    api.getNearbyStations(location.latitude, location.longitude, 50)
      .then((res) => {
        setStations(res.stations || []);
      })
      .catch((err) => {
        console.warn('Failed to load nearby stations:', err);
        setStations([]);
      });
  }, [location.latitude, location.longitude]);

  const handleSearchResult = (result: LocationSearchResult) => {
    // Save to recent searches (deduplicated, max 5)
    const updated = [result, ...recentSearches.filter((s) => s.name !== result.name)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('aeris_recent_searches', JSON.stringify(updated));
    setSelectedStation(null);
  };

  return (
    <div className="container-fluid p-0">
      {/* Search Header */}
      <div className="mb-4">
        <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          Explore Global Air Quality
        </h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '16px' }}>
          Search any city, locality, or geographical coordinates worldwide to view live air quality and physical monitoring stations.
        </p>

        <div style={{ maxWidth: '600px' }}>
          <LocationSearch onSelected={handleSearchResult} placeholder="Search worldwide: e.g. London, Mumbai, Tokyo, 40.7128,-74.0060..." />
        </div>

        {/* Recent Search Pills */}
        {recentSearches.length > 0 && (
          <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <History size={14} className="me-1" />
              Recent:
            </span>
            {recentSearches.map((res, i) => (
              <button
                key={i}
                onClick={() => selectSearchResult(res)}
                className="btn btn-sm"
                style={{
                  fontSize: '0.8rem',
                  padding: '3px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                }}
              >
                {res.name || res.city || res.display_name.split(',')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row g-4">
        {/* Interactive Leaflet Map */}
        <div className="col-12 col-lg-8">
          <AqiMap
            center={[location.latitude, location.longitude]}
            locationName={location.name}
            currentAqi={currentAqi?.aqi_value}
            stations={stations}
            onSelectStation={(st) => setSelectedStation(st)}
            height="500px"
          />

          <div className="d-flex align-items-center gap-4 mt-3" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <div className="d-flex align-items-center gap-2">
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1E3A2F' }} />
              <span style={{ fontWeight: 500 }}>Selected Coordinates (Model Estimate)</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2B6CB0' }} />
              <span style={{ fontWeight: 500 }}>Verified Physical Stations ({stations.length} nearby)</span>
            </div>
          </div>
        </div>

        {/* Selected Location / Station Details */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-3">
          {selectedStation ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--color-border)',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <Radio size={20} color="#2B6CB0" />
                <h6 className="mb-0" style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Monitoring Station Selected
                </h6>
              </div>
              <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {selectedStation.name}
              </h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Source: {selectedStation.source.toUpperCase()} Physical Ground Station
              </p>
              {selectedStation.last_value !== undefined && selectedStation.last_value !== null ? (
                <div className="mb-3">
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Latest Recorded AQI:</span>
                  <div style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {selectedStation.last_value}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  Awaiting real-time sensor transmission for this station.
                </p>
              )}
              <button
                onClick={() => setSelectedStation(null)}
                className="btn btn-sm btn-outline-secondary w-100 mt-2"
              >
                Back to Location Overview
              </button>
            </div>
          ) : (
            <AqiCard
              value={currentAqi?.aqi_value}
              primaryPollutant={currentAqi?.primary_pollutant}
              measurementType={currentAqi?.measurement_type}
              source={currentAqi?.source}
              measuredAt={currentAqi?.measured_at}
              isLoading={isAqiLoading}
            />
          )}

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              padding: '20px 22px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h6 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Nearby Stations Network
            </h6>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
              Physical ground stations monitor actual local sensors. Click on any blue marker on the map to inspect its data.
            </p>
            <div style={{ fontSize: '0.88rem', color: '#2B6CB0', fontWeight: 700 }}>
              {stations.length > 0 ? `${stations.length} active stations detected within 50 km` : 'No physical ground stations registered within 50 km'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
