import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
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
  Menu,
  X,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAqi } from '../../contexts/AqiContext';
import { LocationSearch } from '../Search/LocationSearch';
import { AerisLogo } from '../Common/AerisLogo';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const { user, signOut } = useAuth();
  const { detectLocation } = useLocation();
  const { refreshAqi, isLoading } = useAqi();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [routerLocation.pathname]);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/history', label: 'Trends', icon: TrendingUp },
    { to: '/pollutants', label: 'Pollutants', icon: Wind },
    { to: '/locations', label: 'My Locations', icon: MapPin },
    { to: '/notifications', label: 'Alerts', icon: Bell },
    { to: '/about', label: 'About', icon: Info },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const userInitial = user?.displayName
    ? user.displayName[0].toUpperCase()
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <header className="aeris-navbar-wrapper">
      <div className="aeris-navbar-container">
        {/* Left Section: Brand & Desktop Nav */}
        <div className="d-flex align-items-center gap-3">
          <NavLink to="/" className="aeris-brand" aria-label="AERIS Home">
            <AerisLogo size={32} />
            <span className="aeris-brand-text">AERIS</span>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="d-none d-xl-flex align-items-center gap-1 ms-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `aeris-nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Center/Middle Section: Search & Quick Actions (Desktop & Tablet) */}
        <div className="aeris-search-section d-none d-md-flex align-items-center gap-2">
          <div style={{ width: '270px' }}>
            <LocationSearch placeholder="Search city or coordinates..." />
          </div>

          <button
            onClick={() => {
              detectLocation();
              refreshAqi();
            }}
            disabled={isLoading}
            title="Detect Current Location via GPS"
            className="aeris-icon-btn"
            aria-label="Detect Location"
          >
            <MapPin size={16} />
          </button>

          <button
            onClick={() => refreshAqi()}
            disabled={isLoading}
            title="Refresh Air Quality Data"
            className="aeris-icon-btn"
            aria-label="Refresh Data"
          >
            <RefreshCw size={15} className={isLoading ? 'spinner-border spinner-border-sm' : ''} />
          </button>
        </div>

        {/* Right Section: User Profile & Hamburger */}
        <div className="d-flex align-items-center gap-2">
          {/* User Auth Menu (Desktop) */}
          {user ? (
            <div className="position-relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="aeris-user-btn"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="aeris-avatar">{userInitial}</div>
                <span className="d-none d-lg-inline aeris-username">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={14} className="text-secondary d-none d-lg-inline" />
              </button>

              {userDropdownOpen && (
                <div className="aeris-dropdown-menu">
                  <div className="aeris-dropdown-header">
                    <div className="fw-semibold text-truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {user.displayName || 'User'}
                    </div>
                    <div className="text-secondary small text-truncate">{user.email}</div>
                  </div>
                  <div className="dropdown-divider my-1" />
                  <NavLink
                    to="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="aeris-dropdown-item"
                  >
                    <Settings size={15} />
                    <span>Settings</span>
                  </NavLink>
                  <NavLink
                    to="/notifications"
                    onClick={() => setUserDropdownOpen(false)}
                    className="aeris-dropdown-item"
                  >
                    <Bell size={15} />
                    <span>Notifications</span>
                  </NavLink>
                  <div className="dropdown-divider my-1" />
                  <button
                    onClick={handleSignOut}
                    className="aeris-dropdown-item text-danger w-100 border-0 bg-transparent text-start"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="btn btn-sm d-flex align-items-center gap-1 aeris-signin-btn"
            >
              <UserIcon size={15} />
              <span>Sign In</span>
            </NavLink>
          )}

          {/* Mobile/Tablet Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="aeris-hamburger-btn d-xl-none"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="aeris-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="aeris-mobile-drawer">
            {/* Mobile Search & Action Bar */}
            <div className="p-3 border-bottom" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="flex-grow-1">
                  <LocationSearch placeholder="Search city..." />
                </div>
                <button
                  onClick={() => {
                    detectLocation();
                    refreshAqi();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  title="Detect GPS Location"
                  className="aeris-icon-btn"
                >
                  <MapPin size={16} />
                </button>
                <button
                  onClick={() => {
                    refreshAqi();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  title="Refresh Data"
                  className="aeris-icon-btn"
                >
                  <RefreshCw size={15} className={isLoading ? 'spinner-border spinner-border-sm' : ''} />
                </button>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="p-2">
              <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `aeris-mobile-nav-link ${isActive ? 'active' : ''}`
                        }
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}

                <li className="my-1 border-top" />

                <li>
                  <NavLink
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `aeris-mobile-nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Mobile User Profile Footer */}
            <div className="p-3 border-top mt-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
              {user ? (
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <div className="aeris-avatar">{userInitial}</div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-truncate small" style={{ color: 'var(--color-text-primary)' }}>
                        {user.displayName || user.email?.split('@')[0]}
                      </div>
                      <div className="text-secondary text-truncate" style={{ fontSize: '0.75rem' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 aeris-signin-btn"
                >
                  <UserIcon size={16} />
                  <span>Sign In</span>
                </NavLink>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
};
