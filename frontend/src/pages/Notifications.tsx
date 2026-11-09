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
        return <CheckCircle size={14} color="#16A34A" />;
      case 'failed':
        return <XCircle size={14} color="#DC2626" />;
      case 'skipped':
        return <AlertTriangle size={14} color="#D97706" />;
      default:
        return <Clock size={14} color="#6B7280" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_briefing':
        return 'Daily Briefing';
      case 'high_pollution_alert':
        return 'Pollution Alert';
      case 'test':
        return 'Test';
      default:
        return type;
    }
  };

  const getTypeBadgeStyle = (type: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '12px',
      display: 'inline-block',
    };
    switch (type) {
      case 'daily_briefing':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8' };
      case 'high_pollution_alert':
        return { ...base, backgroundColor: '#FEF2F2', color: '#DC2626' };
      case 'test':
        return { ...base, backgroundColor: '#F3F4F6', color: '#6B7280' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: '#6B7280' };
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
    <div className="container-fluid p-0" style={{ maxWidth: '800px' }}>
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
          Air Quality Notifications
        </h4>
        <p style={{ color: '#687078', fontSize: '0.9rem', marginBottom: 0 }}>
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
            borderRadius: '8px',
            border: '1px solid #E2E5E8',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            marginBottom: '16px',
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 style={{ fontWeight: 600, color: '#202124', marginBottom: 0 }}>
              <Bell size={16} className="me-2" style={{ marginTop: '-2px' }} />
              Notification History
            </h6>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              style={{
                background: 'none',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.8rem',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              {historyLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            >
              {historyError}
            </div>
          )}

          {!historyLoading && history.length === 0 && !historyError && (
            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
              No notifications sent yet. Set up your preferences above to start receiving daily briefings.
            </p>
          )}

          {history.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #F3F4F6',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div className="d-flex align-items-center gap-2">
                      {getStatusIcon(item.delivery_status)}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
                        {item.message_title || 'Notification'}
                      </span>
                    </div>
                    <span style={getTypeBadgeStyle(item.notification_type)}>
                      {getTypeLabel(item.notification_type)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#4B5563',
                      marginBottom: '6px',
                      lineHeight: 1.5,
                    }}
                  >
                    {item.message_body || '--'}
                  </p>
                  <div
                    className="d-flex gap-3 flex-wrap"
                    style={{ fontSize: '0.72rem', color: '#9CA3AF' }}
                  >
                    {item.location_name && <span>Location: {item.location_name}</span>}
                    {item.aqi_value != null && (
                      <span>
                        AQI: {item.aqi_value} ({item.aqi_category})
                      </span>
                    )}
                    {item.aqi_standard && <span>Standard: {item.aqi_standard === 'cpcb_naqi' ? 'CPCB' : 'US EPA'}</span>}
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
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <h6 style={{ fontWeight: 600, color: '#202124', marginBottom: '12px' }}>
          How AERIS Notifications Work
        </h6>
        <div className="d-flex flex-column gap-3" style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.6 }}>
          <div className="d-flex gap-2">
            <ShieldCheck size={18} color="#285B50" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Pure Web Push Technology:</strong> AERIS uses standard W3C Web Push with VAPID authentication. You receive alerts without needing to keep any browser tab open.
            </div>
          </div>
          <div className="d-flex gap-2">
            <Info size={18} color="#285B50" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Fresh Data Verification:</strong> Alerts are only dispatched when validated real-time readings are confirmed by meteorological or station feeds. AERIS never transmits simulated or placeholder AQI numbers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
