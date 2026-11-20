import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { api, SavedLocation } from '../services/api';
import { LocationSearch } from '../components/Search/LocationSearch';
import { MapPin, Star, Trash2, Plus, LogIn } from 'lucide-react';

export const SavedLocations: React.FC = () => {
  const { user, token } = useAuth();
  const { setLocation } = useLocation();

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchSaved = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getSavedLocations(token);
      setSavedLocations(data);
    } catch (err) {
      console.error('Failed to load saved locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteSavedLocation(id, token);
      setSavedLocations((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete saved location:', err);
    }
  };

  const handleSetDefault = async (id: number) => {
    if (!token) return;
    try {
      await api.setDefaultLocation(id, token);
      setSavedLocations((prev) =>
        prev.map((s) => ({
          ...s,
          is_default: s.id === id,
        }))
      );
    } catch (err) {
      console.error('Failed to set default location:', err);
    }
  };

  if (!user) {
    return (
      <div
        className="text-center p-5 mx-auto"
        style={{
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <MapPin size={42} color="var(--color-primary)" className="mb-3" />
        <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Synchronize Favorite Locations</h5>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '22px' }}>
          Create a free AERIS account or sign in to save your monitored homes, workplaces, and travel destinations.
        </p>
        <NavLink
          to="/login"
          className="btn btn-primary btn-sm px-4"
        >
          <LogIn size={16} className="me-2" />
          Sign In / Create Account
        </NavLink>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            My Locations
          </h4>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Pinned monitoring points synced to your account.
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-sm d-flex align-items-center gap-2"
        >
          <Plus size={16} />
          <span>Add Location</span>
        </button>
      </div>

      {showAddModal && (
        <div
          className="p-4 mb-4"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--border-radius)',
            border: '2px solid var(--color-primary)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h6 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            Search & Save a New Location
          </h6>
          <LocationSearch
            autoFocus
            onSelected={async (res) => {
              if (!token) return;
              try {
                // Get or create location in backend to obtain ID
                const aqi = await api.getCurrentAqi(res.latitude, res.longitude);
                if (aqi.location_id) {
                  await api.saveLocation(aqi.location_id, false, token);
                  await fetchSaved();
                  setShowAddModal(false);
                }
              } catch (err: any) {
                alert(err.message || 'Could not save location');
              }
            }}
          />
          <button
            onClick={() => setShowAddModal(false)}
            className="btn btn-sm btn-link text-secondary mt-2 p-0"
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-5 text-center">
          <div className="spinner-border" style={{ color: 'var(--color-primary)' }} role="status" />
        </div>
      ) : savedLocations.length === 0 ? (
        <div
          className="text-center p-5"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-secondary mb-0">No locations saved yet. Click "Add Location" to start.</p>
        </div>
      ) : (
        <div className="row g-3">
          {savedLocations.map((item) => (
            <div key={item.id} className="col-12 col-md-6 col-lg-4">
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--border-radius)',
                  border: item.is_default ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5
                      style={{
                        fontWeight: 800,
                        color: 'var(--color-text-primary)',
                        marginBottom: '2px',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setLocation({
                          latitude: item.location.latitude,
                          longitude: item.location.longitude,
                          name: item.location.name,
                          city: item.location.city,
                          state: item.location.state,
                          country: item.location.country,
                        })
                      }
                    >
                      {item.location.name}
                    </h5>

                    {item.is_default && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          border: '1px solid #BBF7D0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                    {[item.location.state, item.location.country].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div
                  className="pt-3 d-flex justify-content-between align-items-center"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <button
                    onClick={() =>
                      setLocation({
                        latitude: item.location.latitude,
                        longitude: item.location.longitude,
                        name: item.location.name,
                        city: item.location.city,
                        state: item.location.state,
                        country: item.location.country,
                      })
                    }
                    className="btn btn-sm btn-link p-0"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    View on Dashboard
                  </button>

                  <div className="d-flex gap-2">
                    {!item.is_default && (
                      <button
                        onClick={() => handleSetDefault(item.id)}
                        className="btn btn-sm btn-link p-0 text-secondary"
                        title="Set as Default"
                      >
                        <Star size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn btn-sm btn-link p-0 text-danger"
                      title="Remove Location"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
