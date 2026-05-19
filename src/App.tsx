import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

// Components
import DashboardView from './components/DashboardView';
import { RecoveryDashboard } from './components/RecoveryDashboard';
import ClientsView from './components/ClientsView';
import InvoicesView from './components/InvoicesView';
import SettingsView from './components/SettingsView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import LandingPage from './components/LandingPage';
import PublicInvoiceView from './components/PublicInvoiceView';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import RecoveryOpsCenter from './components/RecoveryOpsCenter';
import TemplateManager from './components/TemplateManager';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import ContactPage from './components/ContactPage';
import PricingPage from './pages/PricingPage';
import { PlanProvider } from './contexts/PlanContext';
import { OrganizationProvider } from './contexts/OrganizationContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

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
      <OrganizationProvider>
        <PlanProvider>
          <ScrollToTop />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage user={user} />} />
          <Route path="/pay/:token" element={<PublicInvoiceView />} />
          <Route path="/v/:token" element={<PublicInvoiceView />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/pricing" element={user ? <AuthenticatedLayout><PricingPage isNested /></AuthenticatedLayout> : <PricingPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={user ? <AuthenticatedLayout><DashboardView /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/analytics" element={user ? <AuthenticatedLayout><AnalyticsDashboard /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/recovery" element={user ? <AuthenticatedLayout><RecoveryDashboard /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/operations" element={user ? <AuthenticatedLayout><RecoveryOpsCenter /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/invoices" element={user ? <AuthenticatedLayout><InvoicesView /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/clients" element={user ? <AuthenticatedLayout><ClientsView /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/templates" element={user ? <AuthenticatedLayout><TemplateManager /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <AuthenticatedLayout><SettingsView /></AuthenticatedLayout> : <Navigate to="/" />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </PlanProvider>
    </OrganizationProvider>
  </Router>
);
}
