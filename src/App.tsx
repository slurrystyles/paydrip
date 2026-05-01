import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

// Components
import DashboardView from './components/DashboardView';
import ClientsView from './components/ClientsView';
import InvoicesView from './components/InvoicesView';
import SettingsView from './components/SettingsView';
import LandingPage from './components/LandingPage';
import PublicInvoiceView from './components/PublicInvoiceView';
import AuthenticatedLayout from './components/AuthenticatedLayout';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage user={user} />} />
        <Route path="/v/:token" element={<PublicInvoiceView />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={user ? <AuthenticatedLayout><DashboardView /></AuthenticatedLayout> : <Navigate to="/" />} />
        <Route path="/invoices" element={user ? <AuthenticatedLayout><InvoicesView /></AuthenticatedLayout> : <Navigate to="/" />} />
        <Route path="/clients" element={user ? <AuthenticatedLayout><ClientsView /></AuthenticatedLayout> : <Navigate to="/" />} />
        <Route path="/settings" element={user ? <AuthenticatedLayout><SettingsView /></AuthenticatedLayout> : <Navigate to="/" />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
