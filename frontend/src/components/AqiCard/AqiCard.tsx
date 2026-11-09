import React from 'react';
import { formatAqiValue, getAqiCategory } from '../../utils/aqiUtils';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { DataSourceBadge } from '../DataSourceBadge/DataSourceBadge';

interface AqiCardProps {
  value: number | null | undefined;
  primaryPollutant?: string | null;
  measurementType?: 'station' | 'model_estimate';
  source?: string;
  measuredAt?: string | null;
  standard?: 'us_epa' | 'cpcb_naqi';
  isLoading?: boolean;
}

export const AqiCard: React.FC<AqiCardProps> = ({
  value,
  primaryPollutant,
  measurementType = 'model_estimate',
  source = 'open_meteo',
  measuredAt,
  standard = 'us_epa',
  isLoading = false,
}) => {
  const category = getAqiCategory(value, standard);

  // Freshness indicator logic
  const getFreshnessStatus = () => {
    if (!measuredAt) return { color: '#687078', label: 'Unknown freshness' };
    const diffHours = (new Date().getTime() - new Date(measuredAt).getTime()) / (1000 * 3600);
    if (diffHours < 2) return { color: '#00A651', label: 'Fresh' };
    if (diffHours < 6) return { color: '#F5D000', label: 'Moderate latency' };
    return { color: '#E53935', label: 'Delayed data' };
  };

  const freshness = getFreshnessStatus();

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E5E8',
          borderRadius: '8px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div className="spinner-border" style={{ color: '#285B50' }} role="status">
          <span className="visually-hidden">Loading air quality...</span>
        </div>
        <p className="mt-3 mb-0" style={{ color: '#687078', fontSize: '0.9rem' }}>
          Retrieving live air quality readings...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E5E8',
        borderRadius: '8px',
        padding: '28px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#687078',
            }}
          >
            Air Quality Index ({standard === 'cpcb_naqi' ? 'CPCB NAQI' : 'US EPA'})
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: freshness.color,
            }}
            title={freshness.label}
          />
          <span style={{ fontSize: '0.75rem', color: '#687078' }}>
            {formatRelativeTime(measuredAt)}
          </span>
        </div>
      </div>

      {/* Main AQI Value and Category */}
      <div className="d-flex align-items-baseline gap-4 mb-3">
        <div
          style={{
            fontSize: '4.5rem',
            fontWeight: 800,
            lineHeight: 1,
            color: '#202124',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
          }}
        >
          {formatAqiValue(value)}
        </div>

        <div>
          <div className="d-inline-flex align-items-center gap-2 mb-1">
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: category.color,
              }}
            />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124' }}>
              {category.label}
            </span>
          </div>
          {primaryPollutant && (
            <div style={{ fontSize: '0.85rem', color: '#687078' }}>
              Primary pollutant:{' '}
              <strong style={{ color: '#202124' }}>{primaryPollutant.toUpperCase()}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Meta Footer */}
      <div
        className="pt-3 mt-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ borderTop: '1px solid #E2E5E8' }}
      >
        <DataSourceBadge source={source} measurementType={measurementType} />

        <div style={{ fontSize: '0.8rem', color: '#687078' }}>
          Measured at: {formatDateTime(measuredAt)}
        </div>
      </div>
    </div>
  );
};
