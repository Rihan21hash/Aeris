import React from 'react';

interface DataSourceBadgeProps {
  source: string;
  measurementType: 'station' | 'model_estimate';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, measurementType }) => {
  const isStation = measurementType === 'station';

  const sourceLabels: Record<string, string> = {
    open_meteo: 'Open-Meteo Meteorological Feed',
    openaq: 'OpenAQ Physical Network',
  };

  const label = sourceLabels[source] || source;

  return (
    <div className="d-inline-flex align-items-center gap-2">
      <span
        style={{
          display: 'inline-block',
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          backgroundColor: isStation ? 'var(--color-primary)' : 'var(--color-accent-blue)',
        }}
      />
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
        {label} ({isStation ? 'Monitoring Station' : 'Model Estimate'})
      </span>
    </div>
  );
};
