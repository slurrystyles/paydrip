import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

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
        "flex items-center w-full px-4 py-3 text-sm font-bold rounded-2xl transition-all duration-300",
        active 
          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <span className={cn("mr-3 transition-colors", active ? "text-white" : "text-slate-400")}>{icon}</span>
      {label}
    </button>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = supabase.auth.getUser(); // This is async but we assume session is handled in App.tsx

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={20} />, label: 'Invoices', path: '/invoices' },
    { icon: <Users size={20} />, label: 'Clients', path: '/clients' },
    { icon: <SettingsIcon size={20} />, label: 'Settings', path: '/settings' },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white hidden lg:flex flex-col sticky top-0 h-screen z-30">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100 italic">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Paydrip</span>
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

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200"
          >
            <LogOut size={18} className="mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold italic">P</div>
          <span className="font-bold">Paydrip</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white p-6" onClick={e => e.stopPropagation()}>
             <nav className="space-y-2 mt-12">
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
                 className="flex items-center w-full px-4 py-3 text-sm font-bold text-slate-500 rounded-2xl"
               >
                 <LogOut size={18} className="mr-3" />
                 Sign Out
               </button>
             </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="h-20 bg-white/50 backdrop-blur-sm border-b border-slate-100 hidden lg:flex items-center justify-between px-10 sticky top-0 z-20">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            End-to-End Encrypted
          </div>
          <div className="flex items-center gap-6">
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={20} />
            </button>
            <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
              U
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 pt-24 lg:pt-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
