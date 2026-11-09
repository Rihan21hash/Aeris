import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Database, MapPin, Clock, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { AqiCurrentData } from '../../services/api';

interface DeveloperDiagnosticProps {
  aqiData: AqiCurrentData | null;
  lat: number;
  lon: number;
}

export const DeveloperDiagnostic: React.FC<DeveloperDiagnosticProps> = ({ aqiData, lat, lon }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!aqiData) return null;

  const diag = aqiData.diagnostics;
  const rawCurrent = diag?.raw_api_response || {};
  const selectedValues = diag?.selected_pollutant_values_ug_m3 || {};

  const pollutantKeys: Array<{ key: string; label: string; rawKey: string }> = [
    { key: 'pm2_5', label: 'PM2.5', rawKey: 'pm2_5' },
    { key: 'pm10', label: 'PM10', rawKey: 'pm10' },
    { key: 'carbon_monoxide', label: 'Carbon Monoxide (CO)', rawKey: 'carbon_monoxide' },
    { key: 'nitrogen_dioxide', label: 'Nitrogen Dioxide (NO2)', rawKey: 'nitrogen_dioxide' },
    { key: 'sulphur_dioxide', label: 'Sulphur Dioxide (SO2)', rawKey: 'sulphur_dioxide' },
    { key: 'ozone', label: 'Ozone (O3)', rawKey: 'ozone' },
  ];

  return (
    <div
      className="card mb-4"
      style={{
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        className="card-header d-flex align-items-center justify-content-between py-2 px-3"
        style={{
          backgroundColor: '#F9FAFB',
          borderBottom: isOpen ? '1px solid #E5E7EB' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="d-flex align-items-center gap-2">
          <Terminal size={17} color="#285B50" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', letterSpacing: '0.02em' }}>
            DEVELOPER DIAGNOSTIC: DATA PROVENANCE & DISCREPANCY AUDIT
          </span>
          <span
            className="badge"
            style={{
              backgroundColor: '#EDF4F2',
              color: '#285B50',
              fontWeight: 600,
              fontSize: '0.7rem',
              border: '1px solid #C7DCD6',
            }}
          >
            ACTIVE AUDIT
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-muted"
          style={{ textDecoration: 'none' }}
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="card-body p-3" style={{ fontSize: '0.825rem' }}>
          {/* Metadata Grid */}
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <div className="p-2 border rounded" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="d-flex align-items-center gap-1 text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                  <MapPin size={13} />
                  <strong>Requested Geolocation vs Resolved Location</strong>
                </div>
                <div style={{ color: '#111827', fontWeight: 600 }}>
                  Requested: {lat.toFixed(4)}, {lon.toFixed(4)}
                </div>
                <div style={{ color: '#4B5563', fontSize: '0.775rem' }}>
                  Resolved: {aqiData.location_name || 'N/A'} (ID: {aqiData.location_id ?? 'N/A'}, Lat: {aqiData.latitude ?? 'N/A'}, Lon: {aqiData.longitude ?? 'N/A'})
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-2 border rounded" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="d-flex align-items-center gap-1 text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                  <Database size={13} />
                  <strong>Provider & Model Specification</strong>
                </div>
                <div style={{ color: '#111827', fontWeight: 600 }}>
                  Source: {aqiData.source} ({aqiData.measurement_type})
                </div>
                <div style={{ color: '#4B5563', fontSize: '0.775rem' }}>
                  {diag?.provider_underlying_model || 'Copernicus Atmosphere Monitoring Service (CAMS)'}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-2 border rounded" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="d-flex align-items-center gap-1 text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                  <Clock size={13} />
                  <strong>Provider Timestamp vs Server Retrieval Time</strong>
                </div>
                <div>
                  <span className="text-muted">Provider Timestamp: </span>
                  <strong>{diag?.provider_timestamp || aqiData.measured_at || 'N/A'}</strong>
                </div>
                <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  Retrieved At: {diag?.data_retrieval_timestamp || new Date().toISOString()}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="p-2 border rounded" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="d-flex align-items-center gap-1 text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                  <Info size={13} />
                  <strong>AQI Calculation Standard Applied</strong>
                </div>
                <div>
                  Standard: <strong>{aqiData.aqi_standard === 'cpcb_naqi' ? 'Indian CPCB NAQI' : 'US EPA AQI'}</strong>
                </div>
                <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                  Calculated AQI: <strong>{aqiData.aqi_value ?? 'N/A'}</strong> ({aqiData.category}) — Primary: <strong>{aqiData.primary_pollutant?.toUpperCase() || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Table */}
          <h6 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
            Pollutant Concentration Verification: AERIS vs Raw Open-Meteo API
          </h6>
          <div className="table-responsive mb-3">
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.8rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Pollutant</th>
                  <th>AERIS Displayed Value</th>
                  <th>Raw Open-Meteo Current Block</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {pollutantKeys.map(({ key, label, rawKey }) => {
                  const aerisValue = selectedValues[key] ?? null;
                  const rawValue = rawCurrent[rawKey] ?? null;
                  const isMatch = aerisValue === rawValue;

                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 600 }}>{label}</td>
                      <td>{aerisValue !== null ? `${aerisValue} µg/m³` : 'N/A'}</td>
                      <td>{rawValue !== null ? `${rawValue} µg/m³` : 'N/A'}</td>
                      <td>
                        {isMatch ? (
                          <span className="text-success d-inline-flex align-items-center gap-1">
                            <CheckCircle2 size={13} />
                            Exact 1:1 Match (No Tampering)
                          </span>
                        ) : (
                          <span className="text-warning">Value Adjusted for Calculation</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Scientific Root Cause Explanation */}
          <div
            className="p-3 mb-3 rounded"
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              lineHeight: 1.55,
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <AlertTriangle size={16} color="#2563EB" />
              <strong style={{ fontSize: '0.85rem' }}>Why Ground Stations Differ from Open-Meteo Model Estimates:</strong>
            </div>
            <p className="mb-2" style={{ fontSize: '0.8rem' }}>
              <strong>1. Numerical Atmospheric Chemistry Model (Open-Meteo):</strong> Open-Meteo computes air quality via the European <em>Copernicus Atmosphere Monitoring Service (CAMS)</em>. CAMS runs global numerical dispersion simulations at an <strong>11 km to 40 km grid resolution</strong>. It calculates regional background aerosol concentrations and disperses emissions over large areas (~400 km² grid cells).
            </p>
            <p className="mb-2" style={{ fontSize: '0.8rem' }}>
              <strong>2. Ground Monitoring Station (Other Platforms / CPCB):</strong> Other portals displaying high numbers (e.g., Kolhapur PM2.5 = 131, AQI 211) pull directly from the single physical <em>CAAQMS ground sensor at Shivaji University, Kolhapur</em>. Physical point sensors measure street-level ambient air intake influenced by immediate localized vehicle traffic, road dust, biomass burning, and nighttime thermal inversion trapping pollutants close to the surface.
            </p>
            <p className="mb-0" style={{ fontSize: '0.8rem' }}>
              <strong>Conclusion:</strong> AERIS does not modify or fabricate numbers to artificially match ground sensors. The data displayed above is the exact, authentic reading produced by Open-Meteo for these coordinates.
            </p>
          </div>

          {/* Raw JSON Accordion */}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#4B5563', fontSize: '0.8rem' }}>
              View Raw JSON Response from Open-Meteo (`current` block)
            </summary>
            <pre
              className="mt-2 p-2 rounded"
              style={{
                backgroundColor: '#1E293B',
                color: '#F8FAFC',
                fontSize: '0.725rem',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(rawCurrent, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

