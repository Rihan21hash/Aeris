import React from 'react';
import { NotificationSetup } from '../components/Notifications/NotificationSetup';
import { ShieldCheck, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {

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
