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
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@supabase/supabase-js';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  key?: React.Key;
}

function NavItem({ icon, label, path, active }: NavItemProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        "flex items-center w-full px-6 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 relative group overflow-hidden",
        active 
          ? "bg-slate-900 text-white shadow-2xl shadow-slate-200" 
          : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      <span className={cn("mr-4 transition-colors z-10", active ? "text-indigo-400" : "text-slate-300 group-hover:text-indigo-600")}>{icon}</span>
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
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={18} />, label: 'Invoices', path: '/invoices' },
    { icon: <Users size={18} />, label: 'Clients', path: '/clients' },
    { icon: <SettingsIcon size={18} />, label: 'Settings', path: '/settings' },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#FDFDFF] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-slate-100 bg-white hidden lg:flex flex-col sticky top-0 h-screen z-30">
        <div className="p-10">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-100 italic group-hover:bg-indigo-700 transition-colors"
            >
              P
            </motion.div>
            <span className="text-xl font-black tracking-tighter text-slate-900 italic group-hover:text-indigo-600 transition-colors">Paydrip</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavItem 
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
            />
          ))}
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
        <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 flex items-center justify-between z-40">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-100">P</div>
          <span className="font-black tracking-tighter">Paydrip</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-slate-50 rounded-xl text-slate-600"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-white p-10 shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
               <div className="flex items-center gap-3 mb-16">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">P</div>
                 <span className="text-xl font-black tracking-tighter">Paydrip</span>
               </div>
               <nav className="space-y-4">
                 {navItems.map((item) => (
                   <NavItem 
                     key={item.path}
                     icon={item.icon}
                     label={item.label}
                     path={item.path}
                     active={location.pathname === item.path}
                   />
                 ))}
                 <button 
                   onClick={handleSignOut}
                   className="flex items-center w-full px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
                 >
                   <LogOut size={16} className="mr-4" />
                   End Session
                 </button>
               </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="h-20 bg-white/5 backdrop-blur-sm border-b border-slate-50 hidden lg:flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 shadow-sm">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              Node Status: High Availability
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl w-80 group focus-within:border-indigo-200 transition-all">
              <Search size={14} className="text-slate-400 group-focus-within:text-indigo-600" />
              <input type="text" placeholder="Global Ledger Search..." className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-full placeholder:text-slate-300" />
            </div>
            <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-50 transition-all shadow-sm relative">
              <Bell size={18} />
              <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></div>
            </button>
            
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
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">Verified Node</p>
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

        <main className="flex-1 p-6 lg:p-12 pt-28 lg:pt-12 overflow-y-auto custom-scrollbar">
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
