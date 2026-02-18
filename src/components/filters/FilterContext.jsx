import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DEFAULT_FILTERS = {
  timeRange: '1h',
  from: null,
  to: null,
  timezone: 'UTC',
  service: [],
  level: [],
  trace_id: '',
  span_id: '',
  round_id: '',
  operator_name: '',
  container_name: [],
  target: [],
  image: [],
  status_code: [],
  span_kind: [],
  span_name: '',
  duration_min: '',
  duration_max: '',
  search: '',
  excludeFilters: {},
};

function getTimeRange(preset) {
  const now = new Date();
  const to = now.toISOString();
  const presets = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const from = new Date(now - (presets[preset] || presets['1h'])).toISOString();
  return { from, to };
}

function getIntervalForRange(from, to) {
  const diffMs = new Date(to) - new Date(from);
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 1) return '1 MINUTE';
  if (diffHours <= 6) return '5 MINUTE';
  if (diffHours <= 24) return '15 MINUTE';
  if (diffHours <= 168) return '1 HOUR';
  return '6 HOUR';
}

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('f');
      if (encoded) return { ...DEFAULT_FILTERS, ...JSON.parse(atob(encoded)) };
    } catch {}
    return DEFAULT_FILTERS;
  });

  const resolvedTimes = useCallback(() => {
    if (filters.timeRange === 'custom' && filters.from && filters.to) {
      return { from: filters.from, to: filters.to };
    }
    return getTimeRange(filters.timeRange || '1h');
  }, [filters.timeRange, filters.from, filters.to]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((updates) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const getShareableUrl = useCallback(() => {
    const encoded = btoa(JSON.stringify(filters));
    const url = new URL(window.location.href);
    url.searchParams.set('f', encoded);
    return url.toString();
  }, [filters]);

  const { from, to } = resolvedTimes();
  const interval = getIntervalForRange(from, to);

  // Large range warning
  const diffHours = (new Date(to) - new Date(from)) / (1000 * 60 * 60);
  const isLargeRange = diffHours > 24;
  const hasDeepSearch = !!filters.search;

  return (
    <FilterContext.Provider value={{
      filters, updateFilter, updateFilters, resetFilters,
      getShareableUrl, resolvedTimes,
      from, to, interval,
      isLargeRange, hasDeepSearch,
      showWarning: isLargeRange || hasDeepSearch
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => useContext(FilterContext);