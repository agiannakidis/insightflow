import React from 'react';
import { AuthProvider, useAuth } from '../components/auth/AuthContext';
import LoginPage from '../components/auth/LoginPage';
import { FilterProvider } from '../components/filters/FilterContext';
import GlobalFilterBar from '../components/filters/GlobalFilterBar';
import TracesTable from '../components/traces/TracesTable';
import SavedViewsBar from '../components/common/SavedViewsBar.jsx';

function TracesInner() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <GlobalFilterBar page="traces" />
      <SavedViewsBar page="traces" />
      <div className="flex-1 overflow-hidden">
        <TracesTable />
      </div>
    </div>
  );
}

export default function Traces() {
  return (
    <AuthProvider>
      <AuthGate>
        <FilterProvider>
          <TracesInner />
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