import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, MapPin, Loader2, X } from 'lucide-react';
import { api, LocationSearchResult } from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';

interface LocationSearchProps {
  onSelected?: (result: LocationSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSelected,
  placeholder = 'Search city, state, country or coordinates...',
  autoFocus = false,
}) => {
  const { selectSearchResult } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const resp = await api.searchLocations(query.trim());
        setResults(resp.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Location search failed:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: LocationSearchResult) => {
    selectSearchResult(item);
    onSelected?.(item);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '8px 12px',
          gap: '10px',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <SearchIcon size={18} color="var(--color-primary)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)',
            backgroundColor: 'transparent',
          }}
        />
        {isLoading && <Loader2 size={16} className="spinner-border spinner-border-sm" style={{ color: 'var(--color-primary)' }} />}
        {query && !isLoading && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {results.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSelect(item)}
              style={{
                padding: '11px 14px',
                borderBottom: index < results.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <MapPin size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {item.name || item.city || item.display_name.split(',')[0]}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.display_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
