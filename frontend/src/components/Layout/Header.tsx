import React from 'react';
import { Menu, MapPin, RefreshCw } from 'lucide-react';
import { LocationSearch } from '../Search/LocationSearch';
import { useLocation } from '../../contexts/LocationContext';
import { useAqi } from '../../contexts/AqiContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, pageTitle }) => {
  const { detectLocation } = useLocation();
  const { refreshAqi, isLoading } = useAqi();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E5E8',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1020,
      }}
    >
      <div className="d-flex align-items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="d-md-none btn btn-link p-0 text-dark"
          style={{ textDecoration: 'none' }}
          aria-label="Toggle Navigation"
        >
          <Menu size={22} color="#202124" />
        </button>

        {pageTitle && (
          <h1
            className="mb-0"
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#202124',
              letterSpacing: '-0.01em',
            }}
          >
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="d-flex align-items-center gap-3" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <LocationSearch placeholder="Search city or coordinates..." />
        </div>

        <button
          onClick={() => {
            detectLocation();
            refreshAqi();
          }}
          disabled={isLoading}
          title="Detect Current Location"
          className="btn btn-sm d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: '#F5F6F7',
            border: '1px solid #E2E5E8',
            color: '#285B50',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          <MapPin size={16} />
        </button>

        <button
          onClick={() => refreshAqi()}
          disabled={isLoading}
          title="Refresh AQI Data"
          className="btn btn-sm d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: '#F5F6F7',
            border: '1px solid #E2E5E8',
            color: '#687078',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          <RefreshCw size={15} className={isLoading ? 'spinner-border spinner-border-sm' : ''} />
        </button>
      </div>
    </header>
  );
};
