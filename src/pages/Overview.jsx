import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';
import { FilterProvider, useFilters } from '../components/filters/FilterContext';
import GlobalFilterBar from '../components/filters/GlobalFilterBar';
import MetricCard from '../components/overview/MetricCard';
import LogsVolumeChart from '../components/overview/LogsVolumeChart';
import TracesVolumeChart from '../components/overview/TracesVolumeChart';
import AnomalyChart from '../components/overview/AnomalyChart';
import ErrorRateTable from '../components/overview/ErrorRateTable';
import LatencyTable from '../components/overview/LatencyTable';

function OverviewInner() {
  const { from, to } = useFilters();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('obs_token');
    Promise.all([
      base44.functions.invoke('clickhouseQuery', { type: 'logsCount', params: { from, to }, token }),
      base44.functions.invoke('clickhouseQuery', { type: 'tracesCount', params: { from, to }, token }),
      base44.functions.invoke('clickhouseQuery', { type: 'errorRateByService', params: { from, to }, token }),
    ]).then(([logsRes, tracesRes, errorsRes]) => {
      const totalLogs = logsRes.data?.data?.[0]?.cnt;
      const totalTraces = tracesRes.data?.data?.[0]?.cnt;
      const errorData = errorsRes.data?.data || [];
      const totalErrors = errorData.reduce((s, r) => s + parseInt(r.errors || 0), 0);
      const totalSpans = errorData.reduce((s, r) => s + parseInt(r.total || 0), 0);
      const errorRate = totalSpans > 0 ? ((totalErrors / totalSpans) * 100).toFixed(2) : '0.00';
      setMetrics({ totalLogs, totalTraces, errorRate, errorData });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [from, to]);

  const fmt = (n) => {
    if (n == null) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <GlobalFilterBar page="overview" />
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Logs"
            value={loading ? null : fmt(metrics?.totalLogs)}
            loading={loading}
            color="blue"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
          />
          <MetricCard
            title="Total Spans"
            value={loading ? null : fmt(metrics?.totalTraces)}
            loading={loading}
            color="violet"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
          />
          <MetricCard
            title="Overall Error Rate"
            value={loading ? null : `${metrics?.errorRate}%`}
            loading={loading}
            color={parseFloat(metrics?.errorRate) > 5 ? 'red' : 'green'}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
          />
          <MetricCard
            title="Services"
            value={loading ? null : metrics?.errorData?.length ?? '—'}
            loading={loading}
            color="amber"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LogsVolumeChart />
          <TracesVolumeChart />
        </div>

        {/* Anomaly chart */}
        <AnomalyChart />

        {/* Tables row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ErrorRateTable />
          <LatencyTable />
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  return (
    <AuthProvider>
      <AuthGate>
        <FilterProvider>
          <OverviewInner />
        </FilterProvider>
      </AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <LoginPage />;
  return children;
}