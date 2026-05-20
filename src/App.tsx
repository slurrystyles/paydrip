import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

// Layouts & Providers (kept synchronous for instant shell load and seamless structural shell rendering)
import AuthenticatedLayout from './components/AuthenticatedLayout';
import { PlanProvider } from './contexts/PlanContext';
import { OrganizationProvider } from './contexts/OrganizationContext';

// Route-based dynamic lazy imports
const DashboardView = lazy(() => import('./components/DashboardView'));
const RecoveryDashboard = lazy(() => import('./components/RecoveryDashboard').then(m => ({ default: m.RecoveryDashboard })));
const ClientsView = lazy(() => import('./components/ClientsView'));
const InvoicesView = lazy(() => import('./components/InvoicesView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const PublicInvoiceView = lazy(() => import('./components/PublicInvoiceView'));
const RecoveryOpsCenter = lazy(() => import('./components/RecoveryOpsCenter'));
const TemplateManager = lazy(() => import('./components/TemplateManager'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function RouteLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Loading page...</p>
    </div>
  );
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
          <Suspense fallback={<RouteLoader />}>
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
          </Suspense>
        </PlanProvider>
      </OrganizationProvider>
    </Router>
  );
}
