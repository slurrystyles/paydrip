import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  ArrowUpRight,
  Zap,
  BarChart2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@supabase/supabase-js';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { UpgradeModal } from './UpgradeModal';
import OrganizationSwitcher from './OrganizationSwitcher';
import NotificationCenter from './NotificationCenter';

interface NavItemProps {
  key?: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, path, active, disabled, onClick }: NavItemProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        if (disabled) return;
        navigate(path);
        if (onClick) onClick();
      }}
      className={cn(
        "flex items-center w-full px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 relative group overflow-hidden",
        active 
          ? "bg-slate-900 text-white shadow-2xl shadow-slate-200" 
          : "text-slate-400 hover:text-slate-900 hover:bg-slate-50",
        disabled && "opacity-30 grayscale cursor-not-allowed"
      )}
    >
      <span className={cn("mr-3 transition-colors z-10", active ? "text-indigo-400" : "text-slate-300 group-hover:text-indigo-600")}>{icon}</span>
      <span className="z-10">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500"
        />
      )}
    </button>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { plan } = usePlan();
  const { currentOrganization, capabilities } = useOrganization();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard', required: 'read' },
    { icon: <BarChart2 size={18} />, label: 'Analytics', path: '/analytics', required: 'read' },
    { icon: <FileText size={18} />, label: 'Templates', path: '/templates', required: 'read' },
    { icon: <Zap size={18} />, label: 'Intelligence', path: '/recovery', required: 'recover' },
    { icon: <SettingsIcon size={18} />, label: 'Operations', path: '/operations', required: 'recover' },
    { icon: <FileText size={18} />, label: 'Invoices', path: '/invoices', required: 'read' },
    { icon: <Users size={18} />, label: 'Clients', path: '/clients', required: 'read' },
    { icon: <SettingsIcon size={18} />, label: 'Settings', path: '/settings', required: 'settings' },
  ];

  const filteredNavItems = navItems.filter(item => capabilities.includes(item.required));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#FDFDFF] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-100 bg-white hidden lg:flex flex-col sticky top-0 h-screen z-30">
        <div className="p-5 space-y-6">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group px-2"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-100 italic group-hover:bg-indigo-700 transition-colors"
            >
              P
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-slate-900 italic group-hover:text-indigo-600 transition-colors leading-none">Paydrip</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Enterprise Core</span>
            </div>
          </div>

          <OrganizationSwitcher />
        </div>

        <nav className="flex-1 px-3 py-1 space-y-0.5 mt-2">
          {filteredNavItems.map((item) => (
            <NavItem 
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
            />
          ))}

          {plan === 'free' && (
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center w-full px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50/50 rounded-2xl hover:bg-indigo-100 transition-all group mt-8 border border-indigo-100"
            >
              <Zap size={14} className="mr-4 fill-indigo-600 animate-pulse" />
              Upgrade to Pro
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-2xl transition-all duration-300"
          >
            <LogOut size={16} className="mr-4" />
            End Session
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
        {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[56px] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 flex items-center justify-between z-40">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg">P</div>
          <span className="font-black tracking-tighter text-slate-900">Paydrip</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-slate-50 rounded-xl text-slate-600 transition-all active:scale-90"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-white flex flex-col shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
               <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg">P</div>
                    <span className="font-black tracking-tighter text-slate-900 uppercase italic">Protocol Node</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                    <X size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 <nav className="space-y-1">
                   {filteredNavItems.map((item) => (
                     <NavItem 
                       key={item.path}
                       icon={item.icon}
                       label={item.label}
                       path={item.path}
                       active={location.pathname === item.path}
                       onClick={() => setIsMobileMenuOpen(false)}
                     />
                   ))}
                 </nav>

                 <div className="px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Operations Context</h3>
                    <OrganizationSwitcher />
                 </div>
               </div>

               <div className="p-4 border-t border-slate-50 space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">
                      {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Active</p>
                      <p className="text-sm font-black text-slate-900 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button 
                   onClick={handleSignOut}
                   className="w-full flex items-center gap-3 p-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <LogOut size={16} />
                    Terminate Session
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Header */}
        <header className="h-14 bg-white/5 backdrop-blur-sm border-b border-slate-50 hidden lg:flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 shadow-sm">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              Node: High Availability
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl w-56 group focus-within:border-indigo-200 transition-all">
              <Search size={11} className="text-slate-400 group-focus-within:text-indigo-600" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ledger Search..." 
                className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 w-full placeholder:text-slate-300" 
              />
            </div>
            
            <NotificationCenter />
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-white italic shadow-xl shadow-slate-200 cursor-pointer hover:bg-slate-800 transition-all active:scale-95"
              >
                {user?.email?.[0].toUpperCase() || 'U'}
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 p-8 z-50"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl italic shadow-inner">
                          {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">{plan === 'free' ? 'Verified Node' : `${plan} Access`}</p>
                          <p className="text-sm font-black text-slate-900 truncate tracking-tight">{user?.email?.split('@')[0]}</p>
                          <p className="text-[9px] text-slate-400 font-mono truncate">{user?.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            navigate('/settings');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all flex items-center justify-between group"
                        >
                          Manage Profile
                          <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                        <div className="h-px bg-slate-50 mx-2" />
                        <button 
                          onClick={handleSignOut}
                          className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          Secure Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-6 pt-20 lg:pt-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
             >
               {children}
             </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
