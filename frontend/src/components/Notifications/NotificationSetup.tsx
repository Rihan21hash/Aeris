import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Clock,
  Globe,
  Radio,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { pushNotifications } from '../../services/notifications';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';

const STORAGE_TIME_KEY = 'aeris_preferred_notification_time';
const STORAGE_SUB_ID_KEY = 'aeris_notification_sub_id';

export const NotificationSetup: React.FC = () => {
  const { token } = useAuth();
  const { location, setLocation } = useLocation();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [deliveryVerified, setDeliveryVerified] = useState(false);
  const [lastDeliveryStatus, setLastDeliveryStatus] = useState<string | null>(null);

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

        if (sub) {
          try {
            // Verify with backend whether this endpoint is active in the database
            const verify = await api.verifySubscription(sub.endpoint, token || undefined);

            if (!verify.registered || !verify.enabled || verify.last_delivery_status === 'expired') {
              // The browser token is dead / expired on push service or database
              console.warn('Subscription is expired or inactive:', verify);
              // Clean dead token from browser
              await pushNotifications.unsubscribe();
              setIsSubscribed(false);
              setSubscriptionExpired(true);
              setDeliveryVerified(false);
              setLastDeliveryStatus('expired');
            } else {
              setIsSubscribed(true);
              setSubscriptionExpired(false);
              if (verify.subscription_id) {
                setSubscriptionId(verify.subscription_id);
                localStorage.setItem(STORAGE_SUB_ID_KEY, String(verify.subscription_id));
              }
              setLastDeliveryStatus(verify.last_delivery_status);
              setDeliveryVerified(verify.last_delivery_status === 'delivered');
            }
          } catch (verifyErr) {
            console.warn('Could not verify subscription with backend:', verifyErr);
            // Default to registered but unverified
            setIsSubscribed(true);
            setDeliveryVerified(false);
          }
        } else {
          setIsSubscribed(false);
          setDeliveryVerified(false);
        }

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

      // 2. Request permission and generate brand new subscription in browser
      // (pushNotifications.subscribe unsubscribes any stale token first)
      const sub = await pushNotifications.subscribe(vapidKey);
      if (sub) {
        setIsSubscribed(true);
        setSubscriptionExpired(false);
        setDeliveryVerified(false);
        setLastDeliveryStatus('pending');
        setPermissionState('granted');
        localStorage.setItem(STORAGE_TIME_KEY, preferredTime);

        // 3. Register fresh subscription on backend
        const res = await api.subscribePush(sub.toJSON(), token || undefined);
        const subId = res.subscription_id;
        if (subId) {
          setSubscriptionId(subId);
          localStorage.setItem(STORAGE_SUB_ID_KEY, String(subId));

          // Resolve location ID if currently null
          let locId = location.locationId;
          if (!locId && location.latitude && location.longitude) {
            try {
              const aqiRes = await api.getCurrentAqi(location.latitude, location.longitude);
              locId = aqiRes.location_id;
              if (locId) {
                setLocation({ ...location, locationId: locId });
              }
            } catch (resolveErr) {
              console.warn('Could not resolve location_id for notification pref:', resolveErr);
            }
          }

          // 4. Save delivery time and location preference
          await api.updateNotificationPreferences(
            subId,
            {
              location_id: locId,
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
          text: `Fresh push subscription registered for ${location.name || 'your location'} at ${preferredTime}. Click 'Send Test Notification Now' to verify browser delivery.`,
        });
      }
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      const perm = pushNotifications.getPermissionState();
      setPermissionState(perm);

      if (perm === 'denied') {
        setStatusMsg({
          type: 'error',
          text: 'Notification permission is blocked by your browser. Please allow notifications in your browser site settings and refresh.',
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
      if (!sub) {
        throw new Error("No active browser push subscription found. Click 'Enable Daily Notifications' or 'Re-enable Notifications'.");
      }

      const res = await api.sendTestNotification(
        {
          endpoint: sub.endpoint,
          latitude: location.latitude ?? 28.6139,
          longitude: location.longitude ?? 77.2090,
          location_name: location.name || 'Current Location',
          standard: 'us_epa',
        },
        token || undefined
      );

      setDeliveryVerified(true);
      setSubscriptionExpired(false);
      setLastDeliveryStatus('delivered');
      setStatusMsg({
        type: 'success',
        text: `${res.detail || 'Test notification delivered successfully!'} Check your desktop system notification banner.`,
      });
    } catch (err: any) {
      console.error('Test notification failed:', err);
      const msg = err.message || '';
      if (
        msg.includes('410') ||
        msg.includes('404') ||
        msg.includes('No such subscription') ||
        msg.includes('expired')
      ) {
        // Stale subscription on push service: clear from browser
        try {
          await pushNotifications.unsubscribe();
        } catch {}
        setIsSubscribed(false);
        setSubscriptionExpired(true);
        setDeliveryVerified(false);
        setLastDeliveryStatus('expired');
        setStatusMsg({
          type: 'error',
          text: "Your browser push subscription expired or was revoked (HTTP 410: No such subscription). Stale token has been cleared. Click 'Re-enable Notifications' below to activate a fresh subscription.",
        });
      } else {
        setDeliveryVerified(false);
        setLastDeliveryStatus('failed');
        setStatusMsg({
          type: 'error',
          text: msg || 'Failed to dispatch test notification. Please verify browser notification permissions.',
        });
      }
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
      setSubscriptionExpired(false);
      setDeliveryVerified(false);
      setLastDeliveryStatus(null);
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
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          padding: '24px',
        }}
      >
        <p className="text-secondary mb-0">
          Push notifications are not supported in your current browser environment.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        padding: '28px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Title & Description */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--border-radius-sm)',
            backgroundColor: 'rgba(30, 58, 47, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(30, 58, 47, 0.12)',
            flexShrink: 0,
          }}
        >
          <Bell size={22} color="var(--color-primary)" />
        </div>
        <div>
          <h6 className="mb-0" style={{ color: 'var(--color-text-primary)', fontWeight: 800, fontSize: '1.15rem' }}>
            Daily Air Quality Alerts & Briefings
          </h6>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Scheduled daily briefing with verified AQI and health recommendations for your saved location.
          </span>
        </div>
      </div>

      {/* 4-Way Notification Pipeline Status Matrix */}
      <div className="card p-3 mb-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
          Notification Pipeline Status
        </div>
        <div className="row g-2">
          {/* 1. Browser Permission */}
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="p-2 px-3 bg-white border rounded d-flex flex-column gap-1">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                1. Browser Permission
              </span>
              <div>
                {permissionState === 'granted' && (
                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> Granted
                  </span>
                )}
                {permissionState === 'denied' && (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <XCircle size={12} /> Denied
                  </span>
                )}
                {permissionState === 'default' && (
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <Clock size={12} /> Not Requested
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Push Subscription */}
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="p-2 px-3 bg-white border rounded d-flex flex-column gap-1">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                2. Push Subscription
              </span>
              <div>
                {subscriptionExpired ? (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <AlertTriangle size={12} /> Expired (HTTP 410)
                  </span>
                ) : isSubscribed ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <Radio size={12} /> Registered
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Unregistered
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Notification Preference */}
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="p-2 px-3 bg-white border rounded d-flex flex-column gap-1">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                3. Notification Schedule
              </span>
              <div>
                {isSubscribed ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <Clock size={12} /> Daily at {preferredTime}
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Last Delivery Status */}
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="p-2 px-3 bg-white border rounded d-flex flex-column gap-1">
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                4. Delivery Verification
              </span>
              <div>
                {deliveryVerified ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <ShieldCheck size={12} /> Verified Delivered
                  </span>
                ) : subscriptionExpired ? (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <XCircle size={12} /> Rejected (HTTP 410)
                  </span>
                ) : lastDeliveryStatus === 'failed' ? (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    <XCircle size={12} /> Delivery Failed
                  </span>
                ) : isSubscribed ? (
                  <span className="badge bg-info-subtle text-primary border border-info-subtle d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    <Clock size={12} /> Pending Verification
                  </span>
                ) : (
                  <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Not Tested
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Protocol Notice */}
      <div
        className="d-flex align-items-start gap-2 p-2 px-3 mb-3"
        style={{
          backgroundColor: '#F8F9FA',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: '0.825rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Globe size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Environment Requirement:</strong> Browser push notifications generally require an <strong>HTTPS</strong> connection on desktop browsers (Chrome, Edge, Firefox, Safari). On <strong>localhost</strong>, standard HTTP is supported for local development.
        </span>
      </div>

      {/* Browser Permission Blocked Guidance */}
      {permissionState === 'denied' && (
        <div
          className="alert alert-warning mb-3"
          style={{
            fontSize: '0.9rem',
            backgroundColor: '#FEF3C7',
            borderColor: '#FDE68A',
            color: '#92400E',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <AlertTriangle size={20} style={{ flexShrink: 0, color: '#D97706' }} />
            <strong>Notifications are currently blocked in your browser</strong>
          </div>
          <p className="mb-2" style={{ lineHeight: 1.5 }}>
            Your browser previously blocked notification permissions for this address. To receive alerts:
          </p>
          <ol className="mb-2 ps-3" style={{ lineHeight: 1.6 }}>
            <li>Click the <strong>site settings / permissions</strong> icon on the left of your browser address bar.</li>
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
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} />
            <span>Re-check Permission</span>
          </button>
        </div>
      )}

      {/* Expired Subscription (HTTP 410) Alert & Direct Re-enable Action */}
      {subscriptionExpired && (
        <div
          className="alert alert-warning mb-4"
          style={{
            backgroundColor: '#FEF3C7',
            borderColor: '#FDE68A',
            color: '#92400E',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <AlertTriangle size={20} color="#D97706" />
            <strong style={{ fontSize: '1rem' }}>Push Subscription Expired (HTTP 410)</strong>
          </div>
          <p className="mb-3" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            The push service rejected delivery because your previous browser subscription endpoint was expired or revoked (HTTP 410 Gone: "No such subscription"). Stale browser tokens have been deactivated. Click the button below to generate a fresh, active subscription.
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="btn btn-sm d-inline-flex align-items-center gap-2"
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '8px 18px',
              fontSize: '0.9rem',
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                <span>Re-subscribing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                <span>Re-enable Notifications Now</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Feedback Message */}
      {statusMsg && (
        <div
          className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-danger'} d-flex align-items-center gap-2 mb-3`}
          style={{ fontSize: '0.9rem' }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isSubscribed ? (
        <div>
          {/* Only display verified banner if delivery was actually confirmed by push service */}
          {deliveryVerified ? (
            <div
              className="d-flex align-items-center gap-2 p-3 mb-3"
              style={{
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.95rem',
                color: '#14532D',
              }}
            >
              <CheckCircle2 size={20} color="var(--color-aqi-good)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Verified Active:</strong> Daily notifications confirmed for <strong style={{ color: '#111827' }}>{location.name || 'Current Location'}</strong> at{' '}
                <strong style={{ color: 'var(--color-primary)' }}>{preferredTime}</strong> ({Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time'}).
              </span>
            </div>
          ) : (
            <div
              className="d-flex align-items-center gap-2 p-3 mb-3"
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.95rem',
                color: '#1E40AF',
              }}
            >
              <Clock size={20} color="#2563EB" style={{ flexShrink: 0 }} />
              <span>
                <strong>Subscription Registered:</strong> Push subscription active for <strong style={{ color: '#111827' }}>{location.name || 'Current Location'}</strong>. Click <strong>"Send Test Notification Now"</strong> below to confirm live desktop delivery.
              </span>
            </div>
          )}

          {/* Change Scheduled Time Form */}
          <div className="card p-3 mb-3" style={{ backgroundColor: '#F8F9FA', border: '1px solid var(--color-border)' }}>
            <label htmlFor="prefTimeSubscribed" className="form-label d-flex align-items-center gap-1" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              <Clock size={16} color="var(--color-primary)" />
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
                className="btn btn-sm btn-primary"
              >
                {isUpdatingTime ? 'Saving...' : 'Update Time'}
              </button>
            </div>
            <small className="text-secondary mt-1" style={{ fontSize: '0.8rem' }}>
              Time is saved in local settings and synced with the notification scheduler.
            </small>
          </div>

          {/* Action Buttons */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isTesting}
              className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2"
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              <Send size={15} />
              <span>{isTesting ? 'Sending test...' : 'Send Test Notification Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="btn btn-outline-danger btn-sm"
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            >
              {isLoading ? 'Processing...' : 'Disable Notifications'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="row g-3 align-items-center mb-3">
            <div className="col-auto">
              <label htmlFor="prefTime" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
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
                style={{ width: '140px' }}
              />
            </div>
            <div className="col-auto">
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                ({Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="btn btn-primary btn-sm px-4 d-inline-flex align-items-center gap-2"
              style={{ padding: '8px 20px', fontSize: '0.9rem' }}
            >
              <Bell size={16} />
              <span>{isLoading ? 'Enabling...' : 'Enable Daily Notifications'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
