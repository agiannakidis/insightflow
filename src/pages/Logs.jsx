import React from 'react';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';
import { FilterProvider } from '../components/filters/FilterContext';
import GlobalFilterBar from '../components/filters/GlobalFilterBar';
import LogsTable from '../components/logs/LogsTable';
import SavedViewsBar from '../components/common/SavedViewsBar';

function LogsInner() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <GlobalFilterBar page="logs" />
      <SavedViewsBar page="logs" />
      <div className="flex-1 overflow-hidden">
        <LogsTable />
      </div>
    </div>
  );
}

export default function Logs() {
  return (
    <AuthProvider>
      <AuthGate>
        <FilterProvider>
          <LogsInner />
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