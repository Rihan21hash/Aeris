import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, Send, Clock } from 'lucide-react';
import { pushNotifications } from '../../services/notifications';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';

const STORAGE_TIME_KEY = 'aeris_preferred_notification_time';
const STORAGE_SUB_ID_KEY = 'aeris_notification_sub_id';

export const NotificationSetup: React.FC = () => {
  const { token } = useAuth();
  const { location } = useLocation();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_SUB_ID_KEY);
    return saved ? parseInt(saved, 10) : null;
  });
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferredTime, setPreferredTime] = useState<string>(() => {
    return localStorage.getItem(STORAGE_TIME_KEY) || '08:00';
  });
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);

  const checkStatus = useCallback(async () => {
    const supported = pushNotifications.isSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = pushNotifications.getPermissionState();
      setPermissionState(perm);

      try {
        const sub = await pushNotifications.getCurrentSubscription();
        const hasSub = Boolean(sub);
        setIsSubscribed(hasSub);

        // If authenticated, check if user has a saved preference on the server
        if (token) {
          try {
            const prefs = await api.getNotificationPreferences(token);
            if (prefs && prefs.length > 0) {
              const activePref = prefs.find((p) => p.enabled) || prefs[0];
              if (activePref.preferred_time) {
                setPreferredTime(activePref.preferred_time);
                localStorage.setItem(STORAGE_TIME_KEY, activePref.preferred_time);
              }
              if (activePref.subscription_id) {
                setSubscriptionId(activePref.subscription_id);
                localStorage.setItem(STORAGE_SUB_ID_KEY, String(activePref.subscription_id));
              }
            }
          } catch (prefErr) {
            console.warn('Could not load preferences from backend:', prefErr);
          }
        }
      } catch (err) {
        console.warn('Error checking push subscription:', err);
      }
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleTimeChange = (newTime: string) => {
    setPreferredTime(newTime);
    localStorage.setItem(STORAGE_TIME_KEY, newTime);
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setStatusMsg(null);

    try {
      // 1. Fetch valid VAPID public key
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

      // 2. Request permission and subscribe in browser
      const sub = await pushNotifications.subscribe(vapidKey);
      if (sub) {
        setIsSubscribed(true);
        setPermissionState('granted');
        localStorage.setItem(STORAGE_TIME_KEY, preferredTime);

        // 3. Register subscription on backend
        const res = await api.subscribePush(sub.toJSON(), token || undefined);
        const subId = res.subscription_id;
        if (subId) {
          setSubscriptionId(subId);
          localStorage.setItem(STORAGE_SUB_ID_KEY, String(subId));

          // 4. Save delivery time and location preference
          await api.updateNotificationPreferences(
            subId,
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
          text: `Daily notifications active! You will receive daily air quality updates for ${location.name || 'your location'} at ${preferredTime}.`,
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

  const handleUpdateTime = async () => {
    if (!subscriptionId) {
      // Re-subscribe or re-save
      await handleSubscribe();
      return;
    }

    setIsUpdatingTime(true);
    setStatusMsg(null);
    try {
      await api.updateNotificationPreferences(
        subscriptionId,
        {
          location_id: location.locationId,
          enabled: true,
          preferred_time: preferredTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          frequency: 'daily',
        },
        token || undefined
      );
      localStorage.setItem(STORAGE_TIME_KEY, preferredTime);
      setStatusMsg({
        type: 'success',
        text: `Delivery time updated to ${preferredTime} for ${location.name || 'your location'}.`,
      });
    } catch (err: any) {
      console.error('Failed to update preference time:', err);
      setStatusMsg({
        type: 'error',
        text: 'Failed to update delivery time. Please try again.',
      });
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      const sub = await pushNotifications.getCurrentSubscription();
      const res = await api.sendTestNotification(
        {
          endpoint: sub?.endpoint,
          latitude: location.latitude ?? 28.6139,
          longitude: location.longitude ?? 77.2090,
          location_name: location.name || 'Current Location',
        },
        token || undefined
      );

      setStatusMsg({
        type: 'success',
        text: `${res.detail || 'Test notification delivered!'} Check your system notification banner / tray.`,
      });
    } catch (err: any) {
      console.error('Test notification failed:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to dispatch test notification. Please verify browser notification permissions.',
      });
    } finally {
      setIsTesting(false);
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
      setSubscriptionId(null);
      localStorage.removeItem(STORAGE_SUB_ID_KEY);
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
            Receive a single daily briefing with verified AQI and health recommendations.
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
            Your browser previously blocked notification permissions for this address. To receive alerts:
          </p>
          <ol className="mb-2 ps-3" style={{ lineHeight: 1.6 }}>
            <li>Click the <strong>tune / site settings</strong> icon (or lock icon) on the left of your browser address bar.</li>
            <li>Change <strong>Notifications</strong> from <em>Block</em> to <strong>Allow</strong>.</li>
            <li>Click the button below to re-check permissions.</li>
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
          <div
            className="d-flex align-items-center gap-2 p-2 px-3 mb-3"
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#166534',
            }}
          >
            <CheckCircle2 size={18} color="#16a34a" />
            <span>
              Notifications active for <strong>{location.name || 'Current Location'}</strong> at{' '}
              <strong>{preferredTime}</strong> ({Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time'}).
            </span>
          </div>

          <div className="card p-3 mb-3" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <label htmlFor="prefTimeSubscribed" className="form-label d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
              <Clock size={15} />
              <span>Change Scheduled Delivery Time:</span>
            </label>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <input
                id="prefTimeSubscribed"
                type="time"
                value={preferredTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="form-control form-control-sm"
                style={{ width: '140px', backgroundColor: '#FFFFFF' }}
              />
              <button
                type="button"
                onClick={handleUpdateTime}
                disabled={isUpdatingTime}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#285B50',
                  color: '#FFFFFF',
                  fontWeight: 500,
                }}
              >
                {isUpdatingTime ? 'Saving...' : 'Update Time'}
              </button>
            </div>
            <small className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
              Time is saved in local settings and synced with the notification scheduler.
            </small>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isTesting}
              className="btn btn-sm d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: '#285B50',
                color: '#FFFFFF',
                fontWeight: 600,
                padding: '6px 14px',
              }}
            >
              <Send size={14} />
              <span>{isTesting ? 'Sending...' : 'Send Test Notification Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="btn btn-outline-danger btn-sm"
            >
              {isLoading ? 'Processing...' : 'Disable Notifications'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="row g-3 align-items-center mb-3">
            <div className="col-auto">
              <label htmlFor="prefTime" style={{ fontSize: '0.85rem', color: '#687078' }}>
                Preferred briefing time:
              </label>
            </div>
            <div className="col-auto">
              <input
                id="prefTime"
                type="time"
                value={preferredTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="form-control form-control-sm"
                style={{ width: '130px' }}
              />
            </div>
            <div className="col-auto">
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                ({Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              style={{
                backgroundColor: '#285B50',
                borderColor: '#285B50',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
              className="btn btn-sm px-3"
            >
              {isLoading ? 'Enabling...' : 'Enable Daily Notifications'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
