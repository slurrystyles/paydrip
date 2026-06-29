import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

// Layouts & Providers (kept synchronous for instant shell load and seamless structural shell rendering)
import AuthenticatedLayout from './components/AuthenticatedLayout';
import { PlanProvider } from './contexts/PlanContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Synchronous imports of all components to guarantee zero router-level unmounts, full screen loader flashes, or state wipes during internal workspace navigation
import DashboardView from './components/DashboardView';
import { RecoveryDashboard } from './components/RecoveryDashboard';
import ClientsView from './components/ClientsView';
import InvoicesView from './components/InvoicesView';
import SettingsView from './components/SettingsView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import LandingPage from './components/LandingPage';
import PublicInvoiceView from './components/PublicInvoiceView';
import RecoveryOpsCenter from './components/RecoveryOpsCenter';
import TemplateManager from './components/TemplateManager';
import ContactPage from './components/ContactPage';
import PricingPage from './pages/PricingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import BlogsPage from './pages/BlogsPage';
import BlogPostPage from './pages/BlogPostPage';

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
    supabase.auth.getSession().then(({ data: { session } } : any) => {
      const newUser = session?.user ?? null;
      setUser(prev => prev?.id === newUser?.id ? prev : newUser);
      setLoading(false);
    });

const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const newUser = session?.user ?? null;
      setUser(prev => prev?.id === newUser?.id ? prev : newUser);
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
    <CurrencyProvider>
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
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/blog" element={<BlogsPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/pricing" element={user ? <AuthenticatedLayout><PricingPage isNested /></AuthenticatedLayout> : <PricingPage />} />
                
                {/* Protected Routes */}
                <Route element={user ? <AuthenticatedLayout /> : <Navigate to="/" />}>
                  <Route path="/dashboard" element={<DashboardView />} />
                  <Route path="/analytics" element={<AnalyticsDashboard />} />
                  <Route path="/recovery" element={<RecoveryDashboard />} />
                  <Route path="/operations" element={<RecoveryOpsCenter />} />
                  <Route path="/invoices" element={<InvoicesView />} />
                  <Route path="/clients" element={<ClientsView />} />
                  <Route path="/templates" element={<TemplateManager />} />
                  <Route path="/settings" element={<SettingsView />} />
                </Route>
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </PlanProvider>
        </OrganizationProvider>
      </Router>
    </CurrencyProvider>
  );
}
