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

// Custom pin icons
const createCustomIcon = (color: string, isStation: boolean = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${isStation ? '24px' : '20px'};
        height: ${isStation ? '24px' : '20px'};
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #E2E5E8',
        height,
        width: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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

        {/* User Selected Location Marker (Model Estimate or Primary) */}
        <Marker position={center} icon={createCustomIcon('#285B50')}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#202124' }}>
                {locationName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#687078', marginBottom: '4px' }}>
                Coordinates: {center[0].toFixed(3)}, {center[1].toFixed(3)}
              </div>
              {currentAqi !== null && currentAqi !== undefined && (
                <div style={{ fontSize: '0.85rem' }}>
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
            icon={createCustomIcon('#8E44AD', true)}
            eventHandlers={{
              click: () => onSelectStation?.(st),
            }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#202124' }}>
                  {st.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#687078', marginBottom: '4px' }}>
                  Source: {st.source.toUpperCase()} (Physical Station)
                </div>
                {st.last_value !== undefined && st.last_value !== null && (
                  <div style={{ fontSize: '0.85rem', color: '#202124' }}>
                    Latest Reading: <strong>{st.last_value}</strong>
                  </div>
                )}
                {st.last_updated && (
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '2px' }}>
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

