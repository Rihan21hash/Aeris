import React from 'react';

interface PollutantCardProps {
  name: string;
  displayName: string;
  concentration: number | null | undefined;
  unit?: string;
  aqiContribution?: number | null | undefined;
  available?: boolean;
}

export const PollutantCard: React.FC<PollutantCardProps> = ({
  displayName,
  concentration,
  unit = 'µg/m³',
  aqiContribution,
  available = true,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E5E8',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
          {displayName}
        </span>
        {aqiContribution !== null && aqiContribution !== undefined && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#687078',
              backgroundColor: '#F5F6F7',
              padding: '2px 6px',
              borderRadius: '4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Sub-index: {Math.round(aqiContribution)}
          </span>
        )}
      </div>

      <div className="mt-2">
        {available && concentration !== null && concentration !== undefined ? (
          <div className="d-flex align-items-baseline gap-1">
            <span
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#202124',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(concentration.toFixed(1))}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#687078' }}>{unit}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', color: '#687078', fontStyle: 'italic' }}>
            Not measured
          </span>
        )}
      </div>
    </div>
  );
};
