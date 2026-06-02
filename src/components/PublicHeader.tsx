import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Plus } from 'lucide-react';
import AuthView from './AuthView';
import { usePlan } from '../contexts/PlanContext';

export default function PublicHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { plan } = usePlan();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  const handleNavClick = (id: string) => {
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const easeExpo = [0.16, 1, 0.3, 1] as any;

  return (
    <>
      <nav className="border-b border-[#222222] bg-[#080808]/95 sticky top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img 
              src="/images/logo.png" 
              alt="Paydrip Logo" 
              className="h-12 w-auto object-contain select-none" 
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => handleNavClick('how-it-works')} 
              className="text-sm font-medium text-[#888888] hover:text-[#C8FF00] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button 
              onClick={() => handleNavClick('features')} 
              className="text-sm font-medium text-[#888888] hover:text-[#C8FF00] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => navigate('/pricing')} 
              className="text-sm font-medium text-[#888888] hover:text-[#C8FF00] transition-colors cursor-pointer"
            >
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#C8FF00] text-[#080808] text-xs font-semibold rounded-lg px-4 py-2 hover:bg-[#b8ef00] transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  Go to Dashboard
                  <ArrowUpRight size={14} />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="h-8 w-8 rounded-lg bg-[#111111] border border-[#222222] flex items-center justify-center text-xs font-medium text-[#EEEEEE] cursor-pointer hover:bg-[#1a1a1a] transition-all active:scale-95"
                  >
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </button>
                  
                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-full right-0 mt-3 w-56 bg-[#111111] border border-[#222222] rounded-xl shadow-2xl p-4 z-50 text-left"
                        >
                          <div className="mb-4">
                            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1">
                              {plan === 'free' ? 'Free Plan' : `${plan} Access`}
                            </p>
                            <p className="text-sm font-bold text-[#EEEEEE] truncate tracking-tight">{user?.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-[#888888] font-mono truncate mt-0.5">{user?.email}</p>
                          </div>
                          
                          <div className="space-y-1 border-t border-[#222222] pt-3 flex flex-col">
                            <button 
                              onClick={() => { navigate('/dashboard'); setIsProfileOpen(false); }}
                              className="w-full text-left px-3 py-2 text-xs text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1a1a1a] rounded-lg transition-all cursor-pointer"
                            >
                              Open Dashboard
                            </button>
                            <button 
                              onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                              className="w-full text-left px-3 py-2 text-xs text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1a1a1a] rounded-lg transition-all cursor-pointer"
                            >
                              Settings
                            </button>
                            <button 
                              onClick={handleSignOut}
                              className="w-full text-left px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF444410] rounded-lg transition-all cursor-pointer"
                            >
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowAuth(true)}
                  className="border border-[#222222] bg-transparent text-[#EEEEEE] text-xs font-medium hover:border-[#C8FF00] rounded-lg px-4 py-2 transition-all active:scale-95 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Dark-themed Auth Modal Overlay */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuth(false)}
              className="absolute inset-0 bg-[#0A0A0F]/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-sm max-h-[95vh] overflow-hidden bg-[#080808] text-[#EEEEEE] border border-[#222222] rounded-3xl shadow-2xl flex flex-col"
            >
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => setShowAuth(false)} 
                  className="p-2 bg-[#111111] border border-[#222222] text-[#888888] rounded-full hover:bg-[#1a1a1a] hover:text-[#EEEEEE] transition-all pointer-events-auto active:scale-90 shadow-sm cursor-pointer flex items-center justify-center"
                >
                  <Plus className="rotate-45" size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 scrollbar-hide">
                 <AuthView onClose={() => setShowAuth(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
