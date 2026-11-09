import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useHistory } from '../hooks/useHistory';
import { AqiChart } from '../components/Charts/AqiChart';
import { StatsCard } from '../components/StatsCard/StatsCard';
import { formatDateTime } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export const History: React.FC = () => {
  const { location } = useLocation();
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');
  const { history, extremes, isLoading } = useHistory(location.locationId, timeRange);

  return (
    <div className="container-fluid p-0">
      {/* Header and Toggle */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h4 style={{ fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
            Historical Air Quality Analytics
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#687078' }}>
            Showing records for <strong>{location.name}</strong>
          </span>
        </div>

        {/* Time Range Selector */}
        <div
          className="d-inline-flex p-1"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E5E8',
            borderRadius: '8px',
          }}
        >
          <button
            onClick={() => setTimeRange('24h')}
            className="btn btn-sm"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: timeRange === '24h' ? '#285B50' : 'transparent',
              color: timeRange === '24h' ? '#FFFFFF' : '#687078',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Last 24 Hours
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className="btn btn-sm"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: timeRange === '7d' ? '#285B50' : 'transparent',
              color: timeRange === '7d' ? '#FFFFFF' : '#687078',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Summary Extremes Statistics */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <StatsCard
            title={timeRange === '24h' ? "Today's Maximum AQI" : "7-Day Peak AQI"}
            value={extremes?.max_aqi !== null && extremes?.max_aqi !== undefined ? Math.round(extremes.max_aqi) : '—'}
            subtitle={
              extremes?.max_aqi_timestamp
                ? `Occurred on ${formatDateTime(extremes.max_aqi_timestamp)}`
                : 'Insufficient records'
            }
            icon={ArrowUpRight}
            badgeText={timeRange === '24h' ? 'Peak Hour' : 'Peak Day'}
            badgeColor="#E53935"
          />
        </div>

        <div className="col-12 col-md-4">
          <StatsCard
            title={timeRange === '24h' ? "Today's Minimum AQI" : "7-Day Cleanest AQI"}
            value={extremes?.min_aqi !== null && extremes?.min_aqi !== undefined ? Math.round(extremes.min_aqi) : '—'}
            subtitle={
              extremes?.min_aqi_timestamp
                ? `Occurred on ${formatDateTime(extremes.min_aqi_timestamp)}`
                : 'Insufficient records'
            }
            icon={ArrowDownRight}
            badgeText={timeRange === '24h' ? 'Cleanest Hour' : 'Cleanest Day'}
            badgeColor="#00A651"
          />
        </div>

        <div className="col-12 col-md-4">
          <StatsCard
            title="Arithmetic Average"
            value={extremes?.avg_aqi !== null && extremes?.avg_aqi !== undefined ? extremes.avg_aqi : '—'}
            subtitle={`Derived from ${history?.total_records || 0} timestamped records`}
            icon={Activity}
            badgeText="Mean AQI"
            badgeColor="#285B50"
          />
        </div>
      </div>

      {/* Main Historical Chart */}
      <div className="mb-4">
        <AqiChart
          data={history?.data || []}
          timeRange={timeRange}
          completenessNote={history?.data_completeness_note}
          isLoading={isLoading}
        />
      </div>

      {/* Data Integrity Transparency Note */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '20px',
        }}
      >
        <h6 style={{ fontWeight: 600, color: '#202124', fontSize: '0.9rem', marginBottom: '8px' }}>
          Data Integrity Policy
        </h6>
        <p style={{ fontSize: '0.85rem', color: '#687078', marginBottom: 0, lineHeight: 1.6 }}>
          Historical calculations use authentic timestamped records collected from Open-Meteo and monitoring stations. Missing intervals represent actual monitoring gaps and are displayed as discontinuities rather than artificially interpolated or smoothed curves.
        </p>
      </div>
    </div>
  );
};
