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
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</span>
        {Icon && <Icon size={20} color="var(--color-primary)" />}
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <span
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {badgeText && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '12px',
              backgroundColor: badgeColor ? `${badgeColor}15` : '#F1F3F5',
              color: badgeColor || 'var(--color-primary)',
              border: `1px solid ${badgeColor ? `${badgeColor}30` : 'var(--color-border)'}`,
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{subtitle}</span>
      )}
    </div>
  );
};
