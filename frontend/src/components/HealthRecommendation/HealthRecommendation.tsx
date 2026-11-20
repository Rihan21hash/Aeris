import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert, HeartHandshake } from 'lucide-react';
import { getAqiCategory, getHealthRecommendation, getAqiCardColors } from '../../utils/aqiUtils';

interface HealthRecommendationProps {
  aqiValue: number | null | undefined;
}

export const HealthRecommendation: React.FC<HealthRecommendationProps> = ({
  aqiValue,
}) => {
  const cat = getAqiCategory(aqiValue);
  const text = getHealthRecommendation(aqiValue);
  const cardColors = getAqiCardColors(aqiValue);

  const getIcon = () => {
    if (aqiValue === null || aqiValue === undefined) return HeartHandshake;
    if (aqiValue <= 50) return ShieldCheck;
    if (aqiValue <= 100) return HeartHandshake;
    if (aqiValue <= 200) return AlertCircle;
    if (aqiValue <= 300) return AlertTriangle;
    return ShieldAlert;
  };

  const IconComponent = getIcon();

  return (
    <div
      style={{
        backgroundColor: cardColors.bg,
        border: 'none',
        borderRadius: 'var(--border-radius)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color 0.4s ease',
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <IconComponent size={22} color={cardColors.numberColor} />
        <h6 className="mb-0" style={{ color: 'var(--color-text-primary)', fontWeight: 800, fontSize: '1.05rem' }}>
          Health Advisory — {cat.label}
        </h6>
      </div>
      <p className="mb-0" style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
};
