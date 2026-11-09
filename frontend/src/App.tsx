import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LocationProvider } from './contexts/LocationContext';
import { AqiProvider } from './contexts/AqiContext';
import { Layout } from './components/Layout/Layout';

import { Dashboard } from './pages/Dashboard';
import { Explore } from './pages/Explore';
import { History } from './pages/History';
import { Pollutants } from './pages/Pollutants';
import { SavedLocations } from './pages/SavedLocations';
import { NotificationsPage } from './pages/Notifications';
import { SettingsPage } from './pages/Settings';
import { About } from './pages/About';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

export const App: React.FC = () => {
  return (
    <LocationProvider>
      <AqiProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/history" element={<History />} />
            <Route path="/pollutants" element={<Pollutants />} />
            <Route path="/locations" element={<SavedLocations />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AqiProvider>
    </LocationProvider>
  );
};

export default App;

