import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  TrendingUp,
  Wind,
  MapPin,
  Bell,
  Settings,
  Info,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/history', label: 'Historical Trends', icon: TrendingUp },
    { to: '/pollutants', label: 'Pollutants', icon: Wind },
    { to: '/locations', label: 'My Locations', icon: MapPin },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: '260px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E5E8',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1050,
        transition: 'transform 0.25s ease-in-out',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #E2E5E8',
        }}
      >
        {/* AERIS Geometric Logo */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" stroke="#285B50" strokeWidth="2.5" />
          <path d="M10 16C12 12 16 12 18 16C20 20 24 20 26 16" stroke="#285B50" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M6 16H8" stroke="#285B50" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#285B50',
          }}
        >
          AERIS
        </span>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? '#285B50' : '#4B5563',
                    backgroundColor: isActive ? '#EDF4F2' : 'transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div style={{ margin: '16px 8px', borderTop: '1px solid #E2E5E8' }} />

        <ul className="list-unstyled mb-0">
          <li>
            <NavLink
              to="/about"
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive ? '#285B50' : '#687078',
                backgroundColor: isActive ? '#EDF4F2' : 'transparent',
              })}
            >
              <Info size={18} />
              <span>About AERIS</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #E2E5E8',
          backgroundColor: '#FFFFFF',
        }}
      >
        {user ? (
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#EDF4F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#285B50',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.displayName || user.email?.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#687078', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                color: '#687078',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            style={{
              border: '1px solid #E2E5E8',
              backgroundColor: '#F5F6F7',
              color: '#202124',
              fontWeight: 500,
            }}
          >
            <UserIcon size={16} />
            <span>Sign In</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
