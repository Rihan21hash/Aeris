/**
 * AERIS Backend API Client
 */

export interface PollutantItem {
  name: string;
  display_name: string;
  concentration: number | null;
  unit: string;
  aqi_contribution: number | null;
  available: boolean;
}

export interface PollutantsData {
  location_id: number;
  pollutants: PollutantItem[];
  measured_at: string | null;
  source: string | null;
}

export interface AqiCurrentData {
  aqi_value: number | null;
  aqi_standard: 'us_epa' | 'cpcb_naqi';
  category: string;
  color: string;
  primary_pollutant: string | null;
  measurement_type: 'station' | 'model_estimate';
  source: string;
  measured_at: string | null;
  location_id: number | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  pollutants: PollutantsData | null;
  health_recommendation: string | null;
}

export interface AqiHistoryPoint {
  timestamp: string;
  aqi_value: number | null;
  measurement_type: string | null;
  source: string | null;
  primary_pollutant: string | null;
}

export interface AqiHistoryData {
  location_id: number;
  time_range: '24h' | '7d';
  total_records: number;
  data_completeness_note: string | null;
  data: AqiHistoryPoint[];
}

export interface AqiExtremesData {
  location_id: number;
  time_range: string;
  max_aqi: number | null;
  max_aqi_timestamp: string | null;
  min_aqi: number | null;
  min_aqi_timestamp: string | null;
  avg_aqi: number | null;
}

export interface LocationSearchResult {
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  display_name: string;
}

export interface MonitoringStation {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
  source: string;
  measurement_type: string;
  last_value?: number | null;
  last_updated?: string | null;
}

export interface SavedLocation {
  id: number;
  location: {
    id: number;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
  };
  is_default: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  subscription_id: number;
  location_id: number | null;
  location_name: string | null;
  enabled: boolean;
  preferred_time: string;
  timezone: string;
  frequency: string;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Keep default error text
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Current AQI
  getCurrentAqi(lat: number, lon: number, standard: 'us_epa' | 'cpcb_naqi' = 'us_epa'): Promise<AqiCurrentData> {
    return request<AqiCurrentData>(`/api/aqi/current?lat=${lat}&lon=${lon}&standard=${standard}`);
  },

  // Historical Trends
  getAqiHistory(locationId: number, range: '24h' | '7d' = '24h'): Promise<AqiHistoryData> {
    return request<AqiHistoryData>(`/api/aqi/history?location_id=${locationId}&range=${range}`);
  },

  // Min / Max / Avg
  getAqiExtremes(locationId: number, range: '24h' | '7d' = '24h'): Promise<AqiExtremesData> {
    return request<AqiExtremesData>(`/api/aqi/extremes?location_id=${locationId}&range=${range}`);
  },

  // Pollutants
  getCurrentPollutants(lat: number, lon: number, standard: 'us_epa' | 'cpcb_naqi' = 'us_epa'): Promise<PollutantsData> {
    return request<PollutantsData>(`/api/pollutants/current?lat=${lat}&lon=${lon}&standard=${standard}`);
  },

  // Location search
  searchLocations(query: string): Promise<{ results: LocationSearchResult[]; query: string }> {
    return request<{ results: LocationSearchResult[]; query: string }>(`/api/locations/search?q=${encodeURIComponent(query)}`);
  },

  // Monitoring stations
  getNearbyStations(lat: number, lon: number, radiusKm: number = 50): Promise<{ stations: MonitoringStation[]; count: number }> {
    return request<{ stations: MonitoringStation[]; count: number }>(`/api/stations/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
  },

  // Saved locations (auth required)
  getSavedLocations(token: string): Promise<SavedLocation[]> {
    return request<SavedLocation[]>('/api/locations/saved', {}, token);
  },

  saveLocation(locationId: number, isDefault: boolean, token: string): Promise<SavedLocation> {
    return request<SavedLocation>(
      '/api/locations/saved',
      {
        method: 'POST',
        body: JSON.stringify({ location_id: locationId, is_default: isDefault }),
      },
      token
    );
  },

  deleteSavedLocation(id: number, token: string): Promise<void> {
    return request<void>(`/api/locations/saved/${id}`, { method: 'DELETE' }, token);
  },

  setDefaultLocation(id: number, token: string): Promise<SavedLocation> {
    return request<SavedLocation>(`/api/locations/saved/${id}/default`, { method: 'PUT' }, token);
  },

  // Push notifications
  subscribePush(subscription: PushSubscriptionJSON, token?: string): Promise<{ status: string; subscription_id: number }> {
    return request<{ status: string; subscription_id: number }>(
      '/api/notifications/subscribe',
      {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys?.p256dh,
            auth: subscription.keys?.auth,
          },
        }),
      },
      token
    );
  },

  unsubscribePush(endpoint: string): Promise<{ status: string }> {
    return request<{ status: string }>('/api/notifications/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  },

  getNotificationPreferences(token: string): Promise<NotificationPreference[]> {
    return request<NotificationPreference[]>('/api/notifications/preferences', {}, token);
  },

  updateNotificationPreferences(
    subscriptionId: number,
    data: { location_id?: number | null; enabled: boolean; preferred_time: string; timezone: string; frequency: string },
    token?: string
  ): Promise<NotificationPreference> {
    return request<NotificationPreference>(
      `/api/notifications/preferences?subscription_id=${subscriptionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token
    );
  },

  // User auth sync & profile
  syncUser(token: string): Promise<any> {
    return request<any>('/api/auth/sync', { method: 'POST' }, token);
  },

  getCurrentUser(token: string): Promise<any> {
    return request<any>('/api/auth/me', {}, token);
  },

  updateCurrentUser(data: { display_name?: string; timezone?: string; preferred_aqi_standard?: string }, token: string): Promise<any> {
    return request<any>(
      '/api/auth/me',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token
    );
  },

  // Health
  checkHealth(): Promise<{ status: string; database: string }> {
    return request<{ status: string; database: string }>('/api/health');
  },
};

