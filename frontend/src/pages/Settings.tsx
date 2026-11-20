import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, Sliders, CheckCircle2, ShieldCheck } from 'lucide-react';
import { NotificationSetup } from '../components/Notifications/NotificationSetup';

export const SettingsPage: React.FC = () => {
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
          preferred_aqi_standard: 'us_epa',
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
    <div className="container-fluid p-0" style={{ maxWidth: '820px' }}>
      <div className="mb-4">
        <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Platform Settings
        </h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: 0 }}>
          Manage notifications, account details, and air quality system preferences.
        </p>
      </div>

      {/* AQI Standard Section */}
      <div
        className="mb-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <Sliders size={22} color="var(--color-primary)" />
            <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 0, fontSize: '1.15rem' }}>
              Air Quality Calculation Standard
            </h5>
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            <ShieldCheck size={13} /> Active Standard
          </span>
        </div>

        <div
          className="p-3"
          style={{
            borderRadius: 'var(--border-radius-sm)',
            border: '2px solid var(--color-primary)',
            backgroundColor: '#EDF4F2',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '1.05rem' }}>
            United States EPA AQI
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.6 }}>
            AERIS operates exclusively under the official US EPA Air Quality Index standard. Breakpoints follow US Clean Air Act criteria across 6 severity tiers: Good (0–50), Moderate (51–100), Unhealthy for Sensitive Groups (101–150), Unhealthy (151–200), Very Unhealthy (201–300), and Hazardous (301–500).
          </div>
        </div>
      </div>

      {/* Notifications Configuration Section */}
      <div className="mb-4">
        <NotificationSetup />
      </div>

      {/* Account Settings */}
      {user && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-3">
            <User size={22} color="var(--color-primary)" />
            <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 0, fontSize: '1.15rem' }}>
              Account Profile
            </h5>
          </div>

          {saveSuccess && (
            <div className="alert alert-success d-flex align-items-center gap-2 p-2 mb-3" style={{ fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} />
              <span>Profile updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="form-control"
                style={{ backgroundColor: '#F8F9FA', color: '#6B7280' }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary btn-sm px-4"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="btn btn-sm btn-outline-danger"
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
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
