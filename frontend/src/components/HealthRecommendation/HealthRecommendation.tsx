import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert, HeartHandshake } from 'lucide-react';
import { getAqiCategory, getHealthRecommendation } from '../../utils/aqiUtils';

interface HealthRecommendationProps {
  aqiValue: number | null | undefined;
  standard?: 'us_epa' | 'cpcb_naqi';
}

export const HealthRecommendation: React.FC<HealthRecommendationProps> = ({
  aqiValue,
  standard = 'us_epa',
}) => {
  const cat = getAqiCategory(aqiValue, standard);
  const text = getHealthRecommendation(aqiValue, standard);

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
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E5E8',
        borderRadius: '8px',
        padding: '20px',
        borderLeft: `4px solid ${cat.color}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <IconComponent size={20} color={cat.color} />
        <h6 className="mb-0" style={{ color: '#202124', fontWeight: 600 }}>
          Health Advisory — {cat.label}
        </h6>
      </div>
      <p className="mb-0" style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
};
