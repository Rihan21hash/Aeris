import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MonitoringStation } from '../../services/api';
import { getAqiCategory } from '../../utils/aqiUtils';

// Fix Leaflet default icon paths in bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom pin icons with high visibility
const createCustomIcon = (color: string, isStation: boolean = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${isStation ? '24px' : '22px'};
        height: ${isStation ? '24px' : '22px'};
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #FFFFFF;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface AqiMapProps {
  center: [number, number];
  locationName?: string;
  currentAqi?: number | null;
  stations?: MonitoringStation[];
  onSelectStation?: (station: MonitoringStation) => void;
  height?: string;
}

export const AqiMap: React.FC<AqiMapProps> = ({
  center,
  locationName = 'Selected Location',
  currentAqi,
  stations = [],
  onSelectStation,
  height = '420px',
}) => {
  const locCat = getAqiCategory(currentAqi);

  return (
    <div
      style={{
        borderRadius: 'var(--border-radius)',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        height,
        width: '100%',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Selected Location Marker */}
        <Marker position={center} icon={createCustomIcon('#1E3A2F')}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                {locationName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '4px' }}>
                Coordinates: {center[0].toFixed(3)}, {center[1].toFixed(3)}
              </div>
              {currentAqi !== null && currentAqi !== undefined && (
                <div style={{ fontSize: '0.9rem' }}>
                  AQI:{' '}
                  <strong style={{ color: locCat.color }}>
                    {Math.round(currentAqi)} ({locCat.label})
                  </strong>
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Physical Monitoring Stations */}
        {stations.map((st) => (
          <Marker
            key={st.id}
            position={[st.latitude, st.longitude]}
            icon={createCustomIcon('#2B6CB0', true)}
            eventHandlers={{
              click: () => onSelectStation?.(st),
            }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                  {st.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563', marginBottom: '4px' }}>
                  Source: {st.source.toUpperCase()} (Physical Station)
                </div>
                {st.last_value !== undefined && st.last_value !== null && (
                  <div style={{ fontSize: '0.9rem', color: '#111827' }}>
                    Latest Reading: <strong style={{ color: 'var(--color-primary)' }}>{st.last_value}</strong>
                  </div>
                )}
                {st.last_updated && (
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                    Updated: {new Date(st.last_updated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
