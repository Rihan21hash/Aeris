import React from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useAqi } from '../contexts/AqiContext';
import { AqiCard } from '../components/AqiCard/AqiCard';
import { HealthRecommendation } from '../components/HealthRecommendation/HealthRecommendation';
import { PollutantCard } from '../components/PollutantCard/PollutantCard';
import { AqiChart } from '../components/Charts/AqiChart';
import { useHistory } from '../hooks/useHistory';
import { formatCoordinates, formatDateTime } from '../utils/formatters';
import { formatAqiValue } from '../utils/aqiUtils';
import { MapPin, Clock, AlertCircle, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { location, error: locError } = useLocation();
  const { currentAqi, pollutants, isLoading, error: aqiError } = useAqi();
  const { history, isLoading: isHistoryLoading } = useHistory(location.locationId, '24h');

  return (
    <div className="container-fluid p-0">
      {/* Welcome Banner */}
      <div className="mb-4">
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Welcome to AERIS
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginBottom: 0 }}>
          Understand the air around you with real-time atmospheric intelligence.
        </p>
      </div>

      {/* Location & Metadata Bar */}
      <div
        className="mb-4 p-3 px-4 d-flex flex-wrap align-items-center justify-content-between gap-3"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <MapPin size={20} color="var(--color-primary)" />
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {location.name}
            </span>
            {(location.state || location.country) && (
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
                {[location.state, location.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-4" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <div>
            Coordinates: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatCoordinates(location.latitude, location.longitude)}</span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <Clock size={15} color="var(--color-primary)" />
            <span>Local Time: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{formatDateTime(new Date().toISOString())}</span></span>
          </div>
        </div>
      </div>

      {/* Errors or Alerts */}
      {(aqiError || locError) && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" style={{ borderRadius: 'var(--border-radius-sm)' }}>
          <AlertCircle size={18} />
          <span>{aqiError || locError}</span>
        </div>
      )}

      {/* Temporary Diagnostic Panel (Requirement 9) */}
      <div
        className="mb-4 p-3 px-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px dashed #B89758',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <Activity size={16} color="var(--color-primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
              AQI Calculation Diagnostic
            </span>
          </div>
          <span className="badge" style={{ backgroundColor: '#EDF4F2', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
            Standard: US EPA AQI
          </span>
        </div>
        <div className="row g-2 text-center" style={{ fontSize: '0.85rem' }}>
          <div className="col-6 col-md">
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Raw current.us_aqi</div>
            <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '1.3rem' }}>
              {currentAqi?.raw_us_aqi ?? currentAqi?.diagnostics?.raw_us_aqi ?? '—'}
            </div>
          </div>
          <div className="col-6 col-md">
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Backend AQI</div>
            <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '1.3rem' }}>
              {currentAqi?.aqi_value !== null && currentAqi?.aqi_value !== undefined ? currentAqi.aqi_value : '—'}
            </div>
          </div>
          <div className="col-6 col-md">
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Standard</div>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem', marginTop: '2px' }}>
              US EPA AQI
            </div>
          </div>
          <div className="col-6 col-md">
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Final Displayed AQI</div>
            <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.3rem' }}>
              {formatAqiValue(currentAqi?.aqi_value)}
            </div>
          </div>
          <div className="col-12 col-md">
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>Source Timestamp</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.825rem', marginTop: '4px' }}>
              {currentAqi?.diagnostics?.source_timestamp || currentAqi?.measured_at || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Primary AQI & Health Advisory Grid */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-7">
          <AqiCard
            value={currentAqi?.aqi_value}
            primaryPollutant={currentAqi?.primary_pollutant}
            measurementType={currentAqi?.measurement_type}
            source={currentAqi?.source}
            measuredAt={currentAqi?.measured_at}
            isLoading={isLoading}
          />
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3 justify-content-between">
          <HealthRecommendation aqiValue={currentAqi?.aqi_value} />

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h6 className="mb-2" style={{ color: 'var(--color-text-primary)', fontWeight: 800, fontSize: '1rem' }}>
              Standard Classification
            </h6>
            <p className="mb-0" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Currently reporting using the{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                US EPA Air Quality Index
              </strong>{' '}
              standard.
            </p>
          </div>
        </div>
      </div>

      {/* Pollutant Breakdown Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '1.2rem' }}>
            Pollutant Breakdown
          </h5>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
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
