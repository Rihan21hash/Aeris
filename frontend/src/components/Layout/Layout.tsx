import React, { useState } from 'react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerLocation = useRouterLocation();

  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/':
        return 'Overview';
      case '/explore':
        return 'Explore Global Air Quality';
      case '/history':
        return 'Historical Trends';
      case '/pollutants':
        return 'Pollutant Breakdown';
      case '/locations':
        return 'My Locations';
      case '/notifications':
        return 'Notifications';
      case '/settings':
        return 'Settings';
      case '/about':
        return 'About AERIS';
      case '/login':
        return 'Sign In';
      case '/register':
        return 'Create Account';
      default:
        return 'AERIS';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F6F7' }}>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="d-md-none"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 1040,
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={getPageTitle(routerLocation.pathname)}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
