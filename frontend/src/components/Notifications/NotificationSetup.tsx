import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { pushNotifications } from '../../services/notifications';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';

export const NotificationSetup: React.FC = () => {
  const { token } = useAuth();
  const { location } = useLocation();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferredTime, setPreferredTime] = useState('08:00');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = () => {
    const supported = pushNotifications.isSupported();
    setIsSupported(supported);
    if (supported) {
      const perm = pushNotifications.getPermissionState();
      setPermissionState(perm);
      pushNotifications.getCurrentSubscription().then((sub) => {
        setIsSubscribed(Boolean(sub));
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setStatusMsg(null);

    try {
      // 1. Fetch valid VAPID public key from backend or env
      let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey || vapidKey === 'demo-vapid-key') {
        try {
          const keyData = await api.getVapidPublicKey();
          if (keyData?.public_key) {
            vapidKey = keyData.public_key;
          }
        } catch (keyErr) {
          console.warn('Could not fetch VAPID key from backend:', keyErr);
        }
      }

      if (!vapidKey) {
        throw new Error('VAPID public key is not configured on the server.');
      }

      // 2. Request permission and subscribe
      const sub = await pushNotifications.subscribe(vapidKey);
      if (sub) {
        setIsSubscribed(true);
        setPermissionState('granted');

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
      const perm = pushNotifications.getPermissionState();
      setPermissionState(perm);

      if (perm === 'denied') {
        setStatusMsg({
          type: 'error',
          text: 'Notification permission is blocked by your browser. Please allow notifications in your browser address bar settings and refresh.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: err.message || 'Failed to activate notifications. Please ensure permissions are granted.',
        });
      }
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

      {permissionState === 'denied' && (
        <div
          className="alert alert-warning mb-3"
          style={{
            fontSize: '0.85rem',
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            color: '#92400E',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#D97706' }} />
            <strong>Notifications are currently blocked in your browser</strong>
          </div>
          <p className="mb-2" style={{ lineHeight: 1.5 }}>
            Your browser previously blocked notification permissions for this address. To receive daily updates:
          </p>
          <ol className="mb-2 ps-3" style={{ lineHeight: 1.6 }}>
            <li>Click the <strong>tune / site settings</strong> icon (or lock icon) on the left of your browser address bar.</li>
            <li>Change <strong>Notifications</strong> from <em>Block</em> to <strong>Allow</strong>.</li>
            <li>Click the refresh button below to re-check permissions.</li>
          </ol>
          <button
            type="button"
            onClick={checkStatus}
            className="btn btn-sm d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={13} />
            <span>Re-check Permission</span>
          </button>
        </div>
      )}

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
