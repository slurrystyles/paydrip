import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  History, 
  Globe,
  Settings,
  Users
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function OrganizationSwitcher() {
  const { currentOrganization, memberships, setOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) return (
    <div className="h-12 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group overflow-hidden"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
             <Building2 size={14} />
          </div>
          <div className="text-left overflow-hidden">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1 group-hover:text-indigo-600 transition-colors">Workspace</p>
             <p className="text-[11px] font-black text-slate-900 truncate tracking-tight">{currentOrganization?.name || 'Loading...'}</p>
          </div>
        </div>
        <ChevronDown size={14} className={cn("text-slate-300 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-3 p-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                {memberships.map((m) => (
                  <button
                    key={m.organization_id}
                    onClick={() => {
                      setOrganization(m.organization_id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between transition-all group",
                      m.organization_id === currentOrganization?.id 
                        ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                       <div className={cn(
                         "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                         m.organization_id === currentOrganization?.id ? "bg-indigo-500" : "bg-slate-100 text-slate-400"
                       )}>
                          <span className="text-[10px] font-black uppercase">{m.organization?.name?.[0]}</span>
                       </div>
                       <div className="text-left overflow-hidden">
                          <p className={cn(
                            "text-[10px] font-black truncate",
                            m.organization_id === currentOrganization?.id ? "text-white" : "text-slate-900"
                          )}>{m.organization?.name}</p>
                          <p className={cn(
                            "text-[8px] font-black uppercase tracking-widest leading-none mt-0.5",
                            m.organization_id === currentOrganization?.id ? "text-indigo-400" : "text-slate-400"
                          )}>{m.role}</p>
                       </div>
                    </div>
                    {m.organization_id === currentOrganization?.id && (
                      <Check size={14} className="text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2">
                 <button className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                    <Plus size={12} /> Create
                 </button>
                 <button className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                    <History size={12} /> Switch
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
