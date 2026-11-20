import React from 'react';
import { formatAqiValue, getAqiCategory, getAqiCardColors } from '../../utils/aqiUtils';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { DataSourceBadge } from '../DataSourceBadge/DataSourceBadge';

interface AqiCardProps {
  value: number | null | undefined;
  primaryPollutant?: string | null;
  measurementType?: 'station' | 'model_estimate';
  source?: string;
  measuredAt?: string | null;
  isLoading?: boolean;
}

export const AqiCard: React.FC<AqiCardProps> = ({
  value,
  primaryPollutant,
  measurementType = 'model_estimate',
  source = 'open_meteo',
  measuredAt,
  isLoading = false,
}) => {
  const category = getAqiCategory(value);
  const cardColors = getAqiCardColors(value);

  // Freshness indicator logic
  const getFreshnessStatus = () => {
    if (!measuredAt) return { color: 'var(--color-text-muted)', label: 'Unknown freshness' };
    const diffHours = (new Date().getTime() - new Date(measuredAt).getTime()) / (1000 * 3600);
    if (diffHours < 2) return { color: 'var(--color-aqi-good)', label: 'Live Data' };
    if (diffHours < 6) return { color: 'var(--color-aqi-moderate)', label: 'Moderate Latency' };
    return { color: 'var(--color-aqi-unhealthy)', label: 'Delayed Data' };
  };

  const freshness = getFreshnessStatus();

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          padding: '36px',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="spinner-border" style={{ color: 'var(--color-primary)' }} role="status">
          <span className="visually-hidden">Loading air quality...</span>
        </div>
        <p className="mt-3 mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          Retrieving live air quality readings...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: cardColors.bg,
        border: 'none',
        borderRadius: 'var(--border-radius)',
        padding: '28px',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        transition: 'background-color 0.4s ease',
      }}
    >
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
            }}
          >
            Air Quality Index (US EPA)
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: freshness.color,
            }}
            title={freshness.label}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {formatRelativeTime(measuredAt)}
          </span>
        </div>
      </div>

      {/* Main AQI Value and Category */}
      <div className="d-flex align-items-baseline gap-4 mb-3">
        <div
          style={{
            fontSize: '5rem',
            fontWeight: 800,
            lineHeight: 1,
            color: cardColors.numberColor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
            transition: 'color 0.4s ease',
          }}
        >
          {formatAqiValue(value)}
        </div>

        <div>
          <div className="d-inline-flex align-items-center gap-2 mb-1">
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                backgroundColor: cardColors.color,
                transition: 'background-color 0.4s ease',
              }}
            />
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {category.label}
            </span>
          </div>
          {primaryPollutant && (
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Primary pollutant:{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{primaryPollutant.toUpperCase()}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Meta Footer */}
      <div
        className="pt-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
      >
        <DataSourceBadge source={source} measurementType={measurementType} />

        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          Measured at: <strong style={{ color: 'var(--color-text-primary)' }}>{formatDateTime(measuredAt)}</strong>
        </div>
      </div>
    </div>
  );
};
