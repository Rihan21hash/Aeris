import React from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useAqi } from '../contexts/AqiContext';
import { AqiCard } from '../components/AqiCard/AqiCard';
import { HealthRecommendation } from '../components/HealthRecommendation/HealthRecommendation';
import { PollutantCard } from '../components/PollutantCard/PollutantCard';
import { AqiChart } from '../components/Charts/AqiChart';
import { useHistory } from '../hooks/useHistory';
import { formatCoordinates, formatDateTime } from '../utils/formatters';
import { MapPin, Clock, AlertCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { location, error: locError } = useLocation();
  const { currentAqi, pollutants, isLoading, error: aqiError, aqiStandard } = useAqi();
  const { history, isLoading: isHistoryLoading } = useHistory(location.locationId, '24h');

  return (
    <div className="container-fluid p-0">
      {/* Welcome Banner */}
      <div className="mb-4">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#202124', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Welcome to AERIS
        </h2>
        <p style={{ color: '#687078', fontSize: '1rem', marginBottom: 0 }}>
          Understand the air around you.
        </p>
      </div>

      {/* Location & Metadata Bar */}
      <div
        className="mb-4 p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <MapPin size={18} color="#285B50" />
          <div>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#202124' }}>
              {location.name}
            </span>
            {(location.state || location.country) && (
              <span style={{ fontSize: '0.85rem', color: '#687078', marginLeft: '6px' }}>
                {[location.state, location.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-4" style={{ fontSize: '0.8rem', color: '#687078' }}>
          <div>
            Coordinates: <span style={{ color: '#202124', fontWeight: 500 }}>{formatCoordinates(location.latitude, location.longitude)}</span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <Clock size={14} />
            <span>Local Time: <span style={{ color: '#202124', fontWeight: 500 }}>{formatDateTime(new Date().toISOString())}</span></span>
          </div>
        </div>
      </div>

      {/* Errors or Alerts */}
      {(aqiError || locError) && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" style={{ borderRadius: '8px' }}>
          <AlertCircle size={18} />
          <span>{aqiError || locError}</span>
        </div>
      )}

      {/* Primary AQI & Health Advisory Grid */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <AqiCard
            value={currentAqi?.aqi_value}
            primaryPollutant={currentAqi?.primary_pollutant}
            measurementType={currentAqi?.measurement_type}
            source={currentAqi?.source}
            measuredAt={currentAqi?.measured_at}
            standard={aqiStandard}
            isLoading={isLoading}
          />
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3 justify-content-between">
          <HealthRecommendation aqiValue={currentAqi?.aqi_value} standard={aqiStandard} />

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E5E8',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <h6 className="mb-2" style={{ color: '#202124', fontWeight: 600, fontSize: '0.9rem' }}>
              Standard Classification
            </h6>
            <p className="mb-0" style={{ fontSize: '0.85rem', color: '#687078', lineHeight: 1.5 }}>
              Currently reporting using the{' '}
              <strong style={{ color: '#202124' }}>
                {aqiStandard === 'cpcb_naqi' ? 'Indian CPCB National AQI (NAQI)' : 'US EPA Air Quality Index'}
              </strong>{' '}
              standard. You can customize your standard in Settings.
            </p>
          </div>
        </div>
      </div>

      {/* Pollutant Breakdown Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ fontWeight: 700, color: '#202124', fontSize: '1.1rem' }}>
            Pollutant Breakdown
          </h5>
          <span style={{ fontSize: '0.8rem', color: '#687078' }}>
            Real-time atmospheric concentrations
          </span>
        </div>

        <div className="row g-3">
          {pollutants?.pollutants && pollutants.pollutants.length > 0 ? (
            pollutants.pollutants.map((pol) => (
              <div key={pol.name} className="col-6 col-md-4 col-lg-2">
                <PollutantCard
                  name={pol.name}
                  displayName={pol.display_name.split(' ')[0]}
                  concentration={pol.concentration}
                  unit={pol.unit}
                  aqiContribution={pol.aqi_contribution}
                  available={pol.available}
                />
              </div>
            ))
          ) : (
            ['PM2.5', 'PM10', 'CO', 'NO2', 'SO2', 'O3'].map((name) => (
              <div key={name} className="col-6 col-md-4 col-lg-2">
                <PollutantCard
                  name={name.toLowerCase()}
                  displayName={name}
                  concentration={null}
                  available={false}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 24-Hour Air Quality Trend Chart */}
      <div className="mb-4">
        <AqiChart
          data={history?.data || []}
          timeRange="24h"
          completenessNote={history?.data_completeness_note}
          isLoading={isHistoryLoading}
        />
      </div>
    </div>
  );
};

