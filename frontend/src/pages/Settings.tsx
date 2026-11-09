import React, { useState } from 'react';
import { useAqi } from '../contexts/AqiContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, Sliders, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { aqiStandard, setAqiStandard } = useAqi();
  const { user, token, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.updateCurrentUser(
        {
          display_name: displayName,
          preferred_aqi_standard: aqiStandard,
        },
        token
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
          Platform Settings
        </h4>
        <p style={{ color: '#687078', fontSize: '0.9rem', marginBottom: 0 }}>
          Configure air quality index standards, accounts, and application preferences.
        </p>
      </div>

      {/* AQI Standard Section */}
      <div
        className="mb-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div className="d-flex align-items-center gap-2 mb-3">
          <Sliders size={20} color="#285B50" />
          <h5 style={{ fontWeight: 700, color: '#202124', marginBottom: 0, fontSize: '1.1rem' }}>
            Air Quality Calculation Standard
          </h5>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#687078', marginBottom: '16px' }}>
          Select which national environmental breakpoint formula is applied to raw atmospheric sensor readings.
        </p>

        <div className="d-flex flex-column gap-3 mb-3">
          <label
            className="d-flex align-items-start gap-3 p-3"
            style={{
              borderRadius: '8px',
              border: aqiStandard === 'us_epa' ? '2px solid #285B50' : '1px solid #E2E5E8',
              backgroundColor: aqiStandard === 'us_epa' ? '#EDF4F2' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="aqiStandard"
              value="us_epa"
              checked={aqiStandard === 'us_epa'}
              onChange={() => setAqiStandard('us_epa')}
              style={{ marginTop: '4px', accentColor: '#285B50' }}
            />
            <div>
              <div style={{ fontWeight: 700, color: '#202124', fontSize: '0.95rem' }}>
                United States EPA AQI
              </div>
              <div style={{ fontSize: '0.8rem', color: '#687078', marginTop: '2px' }}>
                Global benchmark used internationally. Breakpoints derived from US Clean Air Act criteria: Good (0-50), Moderate (51-100), Unhealthy for Sensitive Groups (101-150), Unhealthy (151-200), Very Unhealthy (201-300), Hazardous (301-500).
              </div>
            </div>
          </label>

          <label
            className="d-flex align-items-start gap-3 p-3"
            style={{
              borderRadius: '8px',
              border: aqiStandard === 'cpcb_naqi' ? '2px solid #285B50' : '1px solid #E2E5E8',
              backgroundColor: aqiStandard === 'cpcb_naqi' ? '#EDF4F2' : '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="aqiStandard"
              value="cpcb_naqi"
              checked={aqiStandard === 'cpcb_naqi'}
              onChange={() => setAqiStandard('cpcb_naqi')}
              style={{ marginTop: '4px', accentColor: '#285B50' }}
            />
            <div>
              <div style={{ fontWeight: 700, color: '#202124', fontSize: '0.95rem' }}>
                Indian Central Pollution Control Board (CPCB) NAQI
              </div>
              <div style={{ fontSize: '0.8rem', color: '#687078', marginTop: '2px' }}>
                Official standard of India. Evaluates sub-indices across 6 categories: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (401-500). Requires minimum 3 pollutants.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Account Settings */}
      {user && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E5E8',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <User size={20} color="#285B50" />
            <h5 style={{ fontWeight: 700, color: '#202124', marginBottom: 0, fontSize: '1.1rem' }}>
              Account Profile
            </h5>
          </div>

          {saveSuccess && (
            <div className="alert alert-success d-flex align-items-center gap-2 p-2 mb-3" style={{ fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              <span>Profile updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#687078' }}>
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="form-control form-control-sm"
                style={{ backgroundColor: '#F5F6F7' }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.85rem', color: '#687078' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-control form-control-sm"
              />
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-sm px-4"
                style={{ backgroundColor: '#285B50', color: '#FFFFFF', fontWeight: 600 }}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="btn btn-sm btn-outline-danger"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
