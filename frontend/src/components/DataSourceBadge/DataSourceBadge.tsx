import React from 'react';

interface DataSourceBadgeProps {
  source: string;
  measurementType: 'station' | 'model_estimate';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, measurementType }) => {
  const isStation = measurementType === 'station';

  const sourceLabels: Record<string, string> = {
    open_meteo: 'Open-Meteo API',
    openaq: 'OpenAQ Station Network',
    cpcb: 'CPCB Official Network',
  };

  const label = sourceLabels[source] || source;

  return (
    <div className="d-inline-flex align-items-center gap-2">
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isStation ? '#285B50' : '#4A7C59',
        }}
      />
      <span style={{ fontSize: '0.8rem', color: '#687078', fontWeight: 500 }}>
        {label} ({isStation ? 'Monitoring Station' : 'Model Estimate'})
      </span>
    </div>
  );
};
