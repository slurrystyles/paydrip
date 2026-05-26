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
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@supabase/supabase-js';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { UpgradeModal } from './UpgradeModal';
import OrganizationSwitcher from './OrganizationSwitcher';
import NotificationCenter from './NotificationCenter';

interface NavItemProps {
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
      type="button"
      onClick={() => {
        if (disabled) return;
        navigate(path);
        if (onClick) onClick();
      }}
      className={cn(
        "flex items-center w-full px-4 py-3 text-xs font-medium rounded-lg transition-all duration-200 relative group overflow-hidden",
        active 
          ? "bg-[#161616] text-[#C8FF00] border border-[#222222]" 
          : "text-[#888888] hover:text-[#EEEEEE] hover:bg-[#161616]/50",
        disabled && "opacity-30 grayscale cursor-not-allowed"
      )}
    >
      <span className={cn("mr-3 transition-colors z-10", active ? "text-[#C8FF00]" : "text-[#888888] group-hover:text-[#EEEEEE]")}>{icon}</span>
      <span className="z-10">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8FF00]"
        />
      )}
    </button>
  );
}

export default function AuthenticatedLayout({ children }: { children?: React.ReactNode }) {
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

  // Auto-close mobile menu on any navigation or space switching
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, currentOrganization?.id]);

  // Freeze background scrolling when the mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/dashboard', required: 'read' },
    { icon: <BarChart2 size={16} />, label: 'Analytics', path: '/analytics', required: 'read' },
    { icon: <FileText size={16} />, label: 'Templates', path: '/templates', required: 'read' },
    { icon: <Zap size={16} />, label: 'Intelligence', path: '/recovery', required: 'recover' },
    { icon: <SettingsIcon size={16} />, label: 'Operations', path: '/operations', required: 'recover' },
    { icon: <FileText size={16} />, label: 'Invoices', path: '/invoices', required: 'read' },
    { icon: <Users size={16} />, label: 'Clients', path: '/clients', required: 'read' },
    { icon: <SettingsIcon size={16} />, label: 'Settings', path: '/settings', required: 'settings' },
  ];

  const filteredNavItems = navItems.filter(item => capabilities.includes(item.required));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#080808] text-[#EEEEEE] font-['Inter'] selection:bg-[#C8FF00] selection:text-[#080808]">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-[#222222] bg-[#111111] hidden lg:flex flex-col sticky top-0 h-screen z-30">
        <div className="p-5 space-y-6">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-[#C8FF00] rounded-lg flex items-center justify-center text-[#080808] font-bold text-sm select-none">
              P
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-[#EEEEEE]">Paydrip</span>
              <span className="text-[9px] uppercase tracking-wider text-[#444444] mt-0.5">Professional Core</span>
            </div>
          </div>

          <OrganizationSwitcher />
        </div>

        <nav className="flex-1 px-3 py-1 space-y-1 mt-2">
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
              className="flex items-center w-full px-4 py-3 text-xs font-semibold text-[#080808] bg-[#C8FF00] rounded-lg hover:bg-[#b8ef00] transition-all group mt-6"
            >
              <Zap size={14} className="mr-3 fill-[#080808]" />
              Upgrade to Pro
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-[#222222]">
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-xs font-medium text-[#888888] hover:text-[#EF4444] hover:bg-[#EF444410] rounded-lg transition-all duration-200"
          >
            <LogOut size={16} className="mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#080808] border-b border-[#222222] px-4 flex items-center justify-between z-40">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-[#C8FF00] rounded-lg flex items-center justify-center text-[#080808] font-bold text-sm">P</div>
          <span className="font-semibold tracking-tight text-[#EEEEEE]">Paydrip</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-[#111111] border border-[#222222] rounded-lg text-[#EEEEEE] transition-all active:scale-90"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-[#111111] flex flex-col border-r border-[#222222]" 
              onClick={e => e.stopPropagation()}
            >
               <div className="p-6 border-b border-[#222222] flex items-center justify-between">
                  <div 
                    onClick={() => {
                      navigate('/');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 bg-[#C8FF00] rounded-lg flex items-center justify-center text-[#080808] font-bold text-sm">P</div>
                    <span className="font-semibold tracking-tight text-[#EEEEEE]">Paydrip</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 hover:bg-[#1a1a1a] border border-[#222222]/30 rounded-lg text-[#888888]"
                  >
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
                    {plan === 'free' && (
                      <button 
                        type="button"
                        onClick={() => {
                          setShowUpgradeModal(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-xs font-semibold text-[#080808] bg-[#C8FF00] rounded-lg hover:bg-[#b8ef00] transition-all group mt-6"
                      >
                        <Zap size={14} className="mr-3 fill-[#080808]" />
                        Upgrade to Pro
                      </button>
                    )}
                 </nav>

                 <div className="px-2">
                    <h3 className="text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-4">Organization</h3>
                    <OrganizationSwitcher />
                 </div>
               </div>

               <div className="p-4 border-t border-[#222222] space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-[#080808] border border-[#222222] rounded-xl">
                    <div className="w-10 h-10 bg-[#111111] border border-[#222222] rounded-xl flex items-center justify-center text-[#EEEEEE] font-medium text-sm">
                      {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-[#888888] uppercase tracking-widest mb-0.5">Live Session</p>
                      <p className="text-sm font-semibold text-[#EEEEEE] truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-4 text-xs font-semibold text-[#EF4444] hover:bg-[#EF444410] rounded-xl transition-all"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Header */}
        <header className="h-16 bg-[#080808]/95 border-b border-[#222222] hidden lg:flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#111111] border border-[#222222] rounded-full text-[10px] font-mono font-medium text-[#888888]">
              <div className="w-1.5 h-1.5 bg-[#C8FF00] rounded-full animate-pulse"></div>
              Paydrip · Live
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-lg w-56 group focus-within:border-[#333333] transition-all">
              <Search size={14} className="text-[#888888]" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs font-medium text-[#EEEEEE] w-full placeholder:text-[#444444]" 
              />
            </div>
            
            <NotificationCenter />
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="h-9 w-9 rounded-lg bg-[#111111] border border-[#222222] flex items-center justify-center text-xs font-medium text-[#EEEEEE] cursor-pointer hover:bg-[#1a1a1a] transition-all active:scale-95"
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
                      className="absolute top-full right-0 mt-3 w-56 bg-[#111111] border border-[#222222] rounded-xl shadow-2xl p-4 z-50 text-left"
                    >
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1">
                          {plan === 'free' ? 'Free Plan' : `${plan[0].toUpperCase() + plan.slice(1)} Plan`}
                        </p>
                        <p className="text-sm font-bold text-[#EEEEEE] truncate tracking-tight">{user?.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-[#888888] font-mono truncate mt-0.5">{user?.email}</p>
                      </div>
                      
                      <div className="space-y-1 border-t border-[#222222] pt-3 flex flex-col">
                        <button 
                          onClick={() => {
                            navigate('/settings');
                            setIsProfileOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1a1a1a] rounded-lg transition-all flex items-center justify-between group"
                        >
                          Settings
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-all text-[#C8FF00]" />
                        </button>
                        <button 
                          onClick={handleSignOut}
                          className="w-full text-left px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF444410] rounded-lg transition-all"
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
        </header>

        <main className="flex-1 p-5 lg:p-6 pt-24 lg:pt-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
             >
               {children || <Outlet />}
             </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
