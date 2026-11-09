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
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
        }}
      >
        <MapPin size={40} color="#285B50" className="mb-3" />
        <h5 style={{ fontWeight: 700, color: '#202124' }}>Synchronize Favorite Locations</h5>
        <p style={{ color: '#687078', fontSize: '0.9rem', marginBottom: '20px' }}>
          Create a free AERIS account or sign in to save your monitored homes, workplaces, and travel destinations.
        </p>
        <NavLink
          to="/login"
          className="btn btn-sm px-4"
          style={{ backgroundColor: '#285B50', color: '#FFFFFF', fontWeight: 600 }}
        >
          <LogIn size={15} className="me-2" />
          Sign In / Create Account
        </NavLink>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
            My Locations
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#687078' }}>
            Pinned monitoring points synced to your account.
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-sm d-flex align-items-center gap-2"
          style={{ backgroundColor: '#285B50', color: '#FFFFFF', fontWeight: 600 }}
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
            borderRadius: '8px',
            border: '1px solid #285B50',
          }}
        >
          <h6 style={{ fontWeight: 600, color: '#202124', marginBottom: '12px' }}>
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
            className="btn btn-sm btn-link text-muted mt-2 p-0"
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-5 text-center">
          <div className="spinner-border text-secondary" role="status" />
        </div>
      ) : savedLocations.length === 0 ? (
        <div
          className="text-center p-5"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E5E8',
          }}
        >
          <p className="text-muted mb-0">No locations saved yet. Click "Add Location" to start.</p>
        </div>
      ) : (
        <div className="row g-3">
          {savedLocations.map((item) => (
            <div key={item.id} className="col-12 col-md-6 col-lg-4">
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: item.is_default ? '2px solid #285B50' : '1px solid #E2E5E8',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5
                      style={{
                        fontWeight: 700,
                        color: '#202124',
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
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#EDF4F2',
                          color: '#285B50',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#687078', marginBottom: '16px' }}>
                    {[item.location.state, item.location.country].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div
                  className="pt-3 d-flex justify-content-between align-items-center"
                  style={{ borderTop: '1px solid #F0F2F4' }}
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
                    className="btn btn-sm btn-link p-0 text-success"
                    style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    View on Dashboard
                  </button>

                  <div className="d-flex gap-2">
                    {!item.is_default && (
                      <button
                        onClick={() => handleSetDefault(item.id)}
                        className="btn btn-sm btn-link p-0 text-muted"
                        title="Set as Default"
                      >
                        <Star size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn btn-sm btn-link p-0 text-danger"
                      title="Remove Location"
                    >
                      <Trash2 size={16} />
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

