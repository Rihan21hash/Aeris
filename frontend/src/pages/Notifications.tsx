import React, { useState, useEffect } from 'react';
import { NotificationSetup } from '../components/Notifications/NotificationSetup';
import { ShieldCheck, Info, Clock, CheckCircle, XCircle, AlertTriangle, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, NotificationHistoryItem } from '../services/api';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = await user.getIdToken();
      const data = await api.getNotificationHistory(token);
      setHistory(data);
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load notification history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} color="var(--color-aqi-good)" />;
      case 'failed':
        return <XCircle size={16} color="var(--color-aqi-severe)" />;
      case 'skipped':
        return <AlertTriangle size={16} color="var(--color-aqi-poor)" />;
      default:
        return <Clock size={16} color="var(--color-text-secondary)" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_briefing':
        return 'Daily Briefing';
      case 'high_pollution_alert':
        return 'Pollution Alert';
      case 'aqi_improvement':
        return 'Air Improvement';
      case 'test':
        return 'Test';
      default:
        return type;
    }
  };

  const getTypeBadgeStyle = (type: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: '0.75rem',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: '12px',
      display: 'inline-block',
    };
    switch (type) {
      case 'daily_briefing':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' };
      case 'high_pollution_alert':
        return { ...base, backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' };
      case 'aqi_improvement':
        return { ...base, backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' };
      case 'test':
        return { ...base, backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: 'var(--color-text-secondary)' };
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '--';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '820px' }}>
      <div className="mb-4">
        <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Air Quality Notifications
        </h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: 0 }}>
          Manage your scheduled daily air quality briefings and high-pollution advisories.
        </p>
      </div>

      <div className="mb-4">
        <NotificationSetup />
      </div>

      {/* Notification History */}
      {user && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--color-border)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '16px',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 0, fontSize: '1.05rem' }}>
              <Bell size={18} color="var(--color-primary)" className="me-2" style={{ marginTop: '-2px' }} />
              Notification History
            </h6>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="btn btn-sm btn-outline-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '4px 14px',
                fontWeight: 600,
              }}
            >
              {historyLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div className="alert alert-danger mb-3" style={{ fontSize: '0.9rem' }}>
              {historyError}
            </div>
          )}

          {!historyLoading && history.length === 0 && !historyError && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>
              No notifications sent yet. Set up your preferences above to start receiving daily briefings.
            </p>
          )}

          {history.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '14px 16px',
                    backgroundColor: '#F8F9FA',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div className="d-flex align-items-center gap-2">
                      {getStatusIcon(item.delivery_status)}
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {item.message_title || 'Notification'}
                      </span>
                    </div>
                    <span style={getTypeBadgeStyle(item.notification_type)}>
                      {getTypeLabel(item.notification_type)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '6px',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.message_body || '--'}
                  </p>
                  <div
                    className="d-flex gap-3 flex-wrap"
                    style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}
                  >
                    {item.location_name && <span>Location: <strong>{item.location_name}</strong></span>}
                    {item.aqi_value != null && (
                      <span>
                        AQI: <strong>{item.aqi_value}</strong> ({item.aqi_category})
                      </span>
                    )}
                    {item.aqi_standard && <span>Standard: {item.aqi_standard === 'legacy_cpcb' ? 'Legacy CPCB' : 'US EPA'}</span>}
                    <span>Status: {item.delivery_status}</span>
                    <span>{formatTimestamp(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h6 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '12px', fontSize: '1rem' }}>
          How AERIS Notifications Work
        </h6>
        <div className="d-flex flex-column gap-3" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <div className="d-flex gap-2">
            <ShieldCheck size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--color-text-primary)' }}>Pure Web Push Technology:</strong> AERIS uses standard W3C Web Push with VAPID authentication. You receive alerts without needing to keep any browser tab open.
            </div>
          </div>
          <div className="d-flex gap-2">
            <Info size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--color-text-primary)' }}>Fresh Data Verification:</strong> Alerts are only dispatched when validated real-time readings are confirmed by meteorological or station feeds. AERIS never transmits simulated or placeholder AQI numbers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
