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
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
        }}
      >
        <div className="spinner-border text-secondary" role="status" />
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
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '20px',
        }}
      >
        <p className="mb-0 text-muted">No historical air quality records available for this period.</p>
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
        borderRadius: '8px',
        border: '1px solid #E2E5E8',
        padding: '24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Summary Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h6 className="mb-1" style={{ color: '#202124', fontWeight: 600 }}>
            {timeRange === '24h' ? '24-Hour Air Quality Trend' : '7-Day Air Quality Trend'}
          </h6>
          <span style={{ fontSize: '0.8rem', color: '#687078' }}>
            {completenessNote || `Based on ${data.length} verified records.`}
          </span>
        </div>

        <div className="d-flex gap-3">
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#687078', display: 'block' }}>Highest</span>
            <strong style={{ color: '#202124', fontVariantNumeric: 'tabular-nums' }}>
              {highest !== null ? Math.round(highest) : '—'}
            </strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#687078', display: 'block' }}>Lowest</span>
            <strong style={{ color: '#202124', fontVariantNumeric: 'tabular-nums' }}>
              {lowest !== null ? Math.round(lowest) : '—'}
            </strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#687078', display: 'block' }}>Average</span>
            <strong style={{ color: '#202124', fontVariantNumeric: 'tabular-nums' }}>
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
                <stop offset="5%" stopColor="#285B50" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#285B50" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F4" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#687078"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E5E8' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#687078"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E5E8' }}
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
                        border: '1px solid #E2E5E8',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#687078', marginBottom: '4px' }}>
                        {item.label}
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                          }}
                        />
                        <strong style={{ fontSize: '1rem', color: '#202124' }}>
                          AQI: {item.aqi !== null ? Math.round(item.aqi) : 'N/A'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#687078' }}>
                        Category: {cat.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                        {item.measurementType === 'station' ? 'Station Measured' : 'Model Estimate'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Reference severity lines */}
            <ReferenceLine y={50} stroke="#00A651" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={100} stroke="#F5D000" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={150} stroke="#FF8C00" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={200} stroke="#E53935" strokeDasharray="3 3" opacity={0.4} />

            <Area
              type="monotone"
              dataKey="aqi"
              stroke="#285B50"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#aqiFill)"
              connectNulls={false}
              activeDot={{ r: 5, fill: '#285B50' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

