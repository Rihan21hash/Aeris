import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badgeText?: string;
  badgeColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeColor,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E5E8',
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: '0.85rem', color: '#687078', fontWeight: 500 }}>{title}</span>
        {Icon && <Icon size={18} color="#687078" />}
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <span
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#202124',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {badgeText && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: badgeColor ? `${badgeColor}20` : '#F5F6F7',
              color: badgeColor || '#202124',
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: '#687078' }}>{subtitle}</span>
      )}
    </div>
  );
};

