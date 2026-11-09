import React from 'react';
import { EPA_CATEGORIES, CPCB_CATEGORIES } from '../utils/aqiUtils';
import { ShieldCheck, Database } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="container-fluid p-0" style={{ maxWidth: '900px' }}>
      <div className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#285B50" strokeWidth="2.5" />
            <path d="M10 16C12 12 16 12 18 16C20 20 24 20 26 16" stroke="#285B50" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h3 style={{ fontWeight: 800, color: '#285B50', letterSpacing: '0.04em', margin: 0 }}>
            About AERIS
          </h3>
        </div>
        <p style={{ color: '#687078', fontSize: '1.05rem', lineHeight: 1.6, marginTop: '8px' }}>
          AERIS is a modern air quality intelligence platform providing authentic, verified real-time air quality information, historical pollution analytics, and location-based environmental health insights.
        </p>
      </div>

      {/* Core Principles */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E5E8',
              padding: '20px',
              height: '100%',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <ShieldCheck size={20} color="#285B50" />
              <h6 style={{ fontWeight: 700, color: '#202124', margin: 0 }}>Zero Synthetic Data Policy</h6>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#687078', lineHeight: 1.5, margin: 0 }}>
              AERIS strictly forbids simulated numbers, dummy charts, or fabricated placeholder statistics. Every reading represents authentic sensor feeds or verified atmospheric assimilation models.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E5E8',
              padding: '20px',
              height: '100%',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <Database size={20} color="#285B50" />
              <h6 style={{ fontWeight: 700, color: '#202124', margin: 0 }}>Measurement Provenance</h6>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#687078', lineHeight: 1.5, margin: 0 }}>
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
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '24px',
        }}
      >
        <h5 style={{ fontWeight: 700, color: '#202124', marginBottom: '16px' }}>
          Data Sources & Infrastructure
        </h5>

        <div className="d-flex flex-column gap-3">
          <div>
            <h6 style={{ fontWeight: 600, color: '#285B50', marginBottom: '4px' }}>
              Open-Meteo Air Quality API
            </h6>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
              Provides global hourly gridded forecasts and current conditions based on atmospheric dispersion models from Copernicus Atmosphere Monitoring Service (CAMS) and NOAA.
            </p>
          </div>

          <div>
            <h6 style={{ fontWeight: 600, color: '#285B50', marginBottom: '4px' }}>
              OpenAQ Network
            </h6>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
              Aggregates verified physical monitoring station records from official government networks, research institutes, and community sensors across more than 100 countries.
            </p>
          </div>

          <div>
            <h6 style={{ fontWeight: 600, color: '#285B50', marginBottom: '4px' }}>
              OpenStreetMap & Nominatim
            </h6>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>
              Powers global geographic search, boundary resolution, and reverse geocoding in full compliance with OSM usage policies.
            </p>
          </div>
        </div>
      </div>

      {/* AQI Standards Comparison Table */}
      <div
        className="mb-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '24px',
        }}
      >
        <h5 style={{ fontWeight: 700, color: '#202124', marginBottom: '8px' }}>
          AQI Severity Standards Reference
        </h5>
        <p style={{ fontSize: '0.85rem', color: '#687078', marginBottom: '20px' }}>
          AERIS supports both US EPA and Indian CPCB NAQI standards with dedicated breakpoint formulas.
        </p>

        <h6 style={{ fontWeight: 600, color: '#202124', marginBottom: '10px' }}>
          United States EPA AQI
        </h6>
        <div className="table-responsive mb-4">
          <table className="table table-sm table-bordered" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: '120px' }}>Range</th>
                <th>Category</th>
                <th style={{ width: '120px' }}>Colour</th>
              </tr>
            </thead>
            <tbody>
              {EPA_CATEGORIES.map((cat, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{cat.min}–{cat.max}</td>
                  <td><strong>{cat.label}</strong></td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: cat.color,
                        color: cat.textColor,
                        fontWeight: 600,
                        fontSize: '0.75rem',
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

        <h6 style={{ fontWeight: 600, color: '#202124', marginBottom: '10px' }}>
          Indian CPCB National AQI (NAQI)
        </h6>
        <div className="table-responsive">
          <table className="table table-sm table-bordered" style={{ fontSize: '0.85rem' }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: '120px' }}>Range</th>
                <th>Category</th>
                <th style={{ width: '120px' }}>Colour</th>
              </tr>
            </thead>
            <tbody>
              {CPCB_CATEGORIES.map((cat, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{cat.min}–{cat.max}</td>
                  <td><strong>{cat.label}</strong></td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: cat.color,
                        color: cat.textColor,
                        fontWeight: 600,
                        fontSize: '0.75rem',
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
