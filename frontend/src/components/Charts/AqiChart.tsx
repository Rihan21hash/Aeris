import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { AqiHistoryPoint } from '../../services/api';
import { getAqiCategory } from '../../utils/aqiUtils';
import { formatTime, formatDate } from '../../utils/formatters';

interface AqiChartProps {
  data: AqiHistoryPoint[];
  timeRange: '24h' | '7d';
  completenessNote?: string | null;
  isLoading?: boolean;
}

export const AqiChart: React.FC<AqiChartProps> = ({
  data,
  timeRange,
  completenessNote,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          height: '320px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="spinner-border" style={{ color: 'var(--color-primary)' }} role="status" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: '320px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '20px',
        }}
      >
        <p className="mb-0 text-secondary">No historical air quality records available for this period.</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartPoints = data.map((point) => {
    const d = new Date(point.timestamp);
    const label = timeRange === '24h' ? formatTime(point.timestamp) : formatDate(point.timestamp);
    return {
      rawTime: d.getTime(),
      label,
      aqi: point.aqi_value,
      source: point.source,
      measurementType: point.measurement_type,
    };
  });

  const validPoints = data.filter((p) => p.aqi_value !== null && p.aqi_value !== undefined);
  const highest = validPoints.length > 0 ? Math.max(...validPoints.map((p) => p.aqi_value!)) : null;
  const lowest = validPoints.length > 0 ? Math.min(...validPoints.map((p) => p.aqi_value!)) : null;
  const avg =
    validPoints.length > 0
      ? (validPoints.reduce((sum, p) => sum + p.aqi_value!, 0) / validPoints.length).toFixed(1)
      : null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Summary Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h6 className="mb-1" style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '1.05rem' }}>
            {timeRange === '24h' ? '24-Hour Air Quality Trend' : '7-Day Air Quality Trend'}
          </h6>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            {completenessNote || `Based on ${data.length} verified records.`}
          </span>
        </div>

        <div className="d-flex gap-4">
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: 600 }}>Highest</span>
            <strong style={{ color: '#B91C1C', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
              {highest !== null ? Math.round(highest) : '—'}
            </strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: 600 }}>Lowest</span>
            <strong style={{ color: '#15803D', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
              {lowest !== null ? Math.round(lowest) : '—'}
            </strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: 600 }}>Average</span>
            <strong style={{ color: 'var(--color-text-primary)', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>
              {avg !== null ? avg : '—'}
            </strong>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A2F" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#1E3A2F" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#E2E6EA' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#4B5563"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#E2E6EA' }}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const cat = getAqiCategory(item.aqi);
                  return (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E6EA',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '4px' }}>
                        {item.label}
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                          }}
                        />
                        <strong style={{ fontSize: '1.1rem', color: '#111827' }}>
                          AQI: {item.aqi !== null ? Math.round(item.aqi) : 'N/A'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                        Category: <strong style={{ color: cat.color }}>{cat.label}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                        {item.measurementType === 'station' ? 'Station Measured' : 'Model Estimate'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Reference severity lines */}
            <ReferenceLine y={50} stroke="#15803D" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={100} stroke="#B45309" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={150} stroke="#C2410C" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={200} stroke="#B91C1C" strokeDasharray="3 3" opacity={0.4} />

            <Area
              type="monotone"
              dataKey="aqi"
              stroke="#1E3A2F"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#aqiFill)"
              connectNulls={false}
              activeDot={{ r: 6, fill: '#1E3A2F', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
