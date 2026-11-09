import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { pushNotifications } from '../../services/notifications';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';

export const NotificationSetup: React.FC = () => {
  const { token } = useAuth();
  const { location } = useLocation();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferredTime, setPreferredTime] = useState('08:00');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = pushNotifications.isSupported();
    setIsSupported(supported);
    if (supported) {
      pushNotifications.getCurrentSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setStatusMsg(null);

    try {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'demo-vapid-key';
      const sub = await pushNotifications.subscribe(vapidKey);
      if (sub) {
        setIsSubscribed(true);

        // Send subscription to backend
        const res = await api.subscribePush(sub.toJSON(), token || undefined);

        // Update default preferences with user's preferred time and location
        if (res.subscription_id) {
          await api.updateNotificationPreferences(
            res.subscription_id,
            {
              location_id: location.locationId,
              enabled: true,
              preferred_time: preferredTime,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              frequency: 'daily',
            },
            token || undefined
          );
        }

        setStatusMsg({
          type: 'success',
          text: `Daily notifications active! You will receive daily air quality updates at ${preferredTime}.`,
        });
      }
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to activate notifications. Please ensure browser permissions are allowed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const current = await pushNotifications.getCurrentSubscription();
      if (current) {
        await api.unsubscribePush(current.endpoint);
        await pushNotifications.unsubscribe();
      }
      setIsSubscribed(false);
      setStatusMsg({
        type: 'success',
        text: 'You have been unsubscribed from air quality notifications.',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: 'Failed to unsubscribe. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E5E8',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        <p className="text-muted mb-0">
          Push notifications are not supported in your current browser environment.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E5E8',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#F5F6F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} color="#285B50" />
        </div>
        <div>
          <h6 className="mb-0" style={{ color: '#202124', fontWeight: 600 }}>
            Daily Air Quality Alerts
          </h6>
          <span style={{ fontSize: '0.85rem', color: '#687078' }}>
            Get a single morning notification with live AQI and health recommendations.
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-danger'} d-flex align-items-center gap-2 mb-3`}
          style={{ fontSize: '0.85rem' }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isSubscribed ? (
        <div>
          <div className="d-flex align-items-center gap-2 mb-3 text-success" style={{ fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} />
            <span>Active for <strong>{location.name}</strong> at <strong>{preferredTime}</strong></span>
          </div>
          <button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="btn btn-outline-danger btn-sm"
          >
            {isLoading ? 'Processing...' : 'Disable Notifications'}
          </button>
        </div>
      ) : (
        <div>
          <div className="row g-3 align-items-center mb-3">
            <div className="col-auto">
              <label htmlFor="prefTime" style={{ fontSize: '0.85rem', color: '#687078' }}>
                Preferred time:
              </label>
            </div>
            <div className="col-auto">
              <input
                id="prefTime"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="form-control form-control-sm"
                style={{ width: '130px' }}
              />
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            style={{
              backgroundColor: '#285B50',
              borderColor: '#285B50',
              color: '#FFFFFF',
            }}
            className="btn btn-sm px-3"
          >
            {isLoading ? 'Enabling...' : 'Enable Daily Notifications'}
          </button>
        </div>
      )}
    </div>
  );
};
