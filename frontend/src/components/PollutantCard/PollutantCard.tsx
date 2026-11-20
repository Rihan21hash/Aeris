import React from 'react';
import { getAqiCardColors } from '../../utils/aqiUtils';

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
  const subColors = getAqiCardColors(aqiContribution);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: '16px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {displayName}
        </span>
        {aqiContribution !== null && aqiContribution !== undefined && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: subColors.numberColor,
              backgroundColor: subColors.bg,
              border: `1px solid ${subColors.border}`,
              padding: '2px 8px',
              borderRadius: '6px',
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease',
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
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(concentration.toFixed(1))}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{unit}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Not measured
          </span>
        )}
      </div>
    </div>
  );
};
