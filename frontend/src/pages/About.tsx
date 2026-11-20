import React from 'react';
import { EPA_CATEGORIES } from '../utils/aqiUtils';
import { ShieldCheck, Database } from 'lucide-react';
import { AerisLogo } from '../components/Common/AerisLogo';

export const About: React.FC = () => {
  return (
    <div className="container-fluid p-0" style={{ maxWidth: '920px' }}>
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <AerisLogo size={36} />
          <h3 style={{ fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '0.04em', margin: 0 }}>
            About AERIS
          </h3>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginTop: '8px' }}>
          AERIS is a modern air quality intelligence platform providing authentic, verified real-time air quality information, historical pollution analytics, and location-based environmental health insights.
        </p>
      </div>

      {/* Core Principles */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              padding: '24px',
              height: '100%',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <ShieldCheck size={22} color="var(--color-primary)" />
              <h6 style={{ fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontSize: '1.05rem' }}>Zero Synthetic Data Policy</h6>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              AERIS strictly forbids simulated numbers, dummy charts, or fabricated placeholder statistics. Every reading represents authentic sensor feeds or verified atmospheric assimilation models.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
              padding: '24px',
              height: '100%',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <Database size={22} color="var(--color-primary)" />
              <h6 style={{ fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontSize: '1.05rem' }}>Measurement Provenance</h6>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              The platform transparently distinguishes between physical in-situ monitoring stations (such as government ground sensors) and grid-based numerical model estimates.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div
        className="mb-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '26px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', fontSize: '1.15rem' }}>
          Data Sources & Infrastructure
        </h5>

        <div className="d-flex flex-column gap-3">
          <div>
            <h6 style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
              Open-Meteo Air Quality API
            </h6>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Provides global hourly gridded forecasts and current conditions based on atmospheric dispersion models from Copernicus Atmosphere Monitoring Service (CAMS) and NOAA.
            </p>
          </div>

          <div>
            <h6 style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
              OpenAQ Network
            </h6>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Aggregates verified physical monitoring station records from official government networks, research institutes, and community sensors across more than 100 countries.
            </p>
          </div>

          <div>
            <h6 style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
              OpenStreetMap & Nominatim
            </h6>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Powers global geographic search, boundary resolution, and reverse geocoding in full compliance with OSM usage policies.
            </p>
          </div>
        </div>
      </div>

      {/* AQI Standards Reference Table */}
      <div
        className="mb-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '26px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: '1.15rem' }}>
          Air Quality Index (US EPA AQI) Reference
        </h5>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
          AERIS operates exclusively under the United States Environmental Protection Agency (US EPA) AQI standard.
        </p>

        <div className="table-responsive">
          <table className="table table-sm" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Range</th>
                <th>Category</th>
                <th style={{ width: '130px' }}>Colour</th>
              </tr>
            </thead>
            <tbody>
              {EPA_CATEGORIES.map((cat, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{cat.min}–{cat.max}</td>
                  <td><strong>{cat.label}</strong></td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        backgroundColor: cat.color,
                        color: cat.textColor,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {cat.color}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
