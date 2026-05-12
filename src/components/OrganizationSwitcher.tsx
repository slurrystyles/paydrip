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
  const { currentOrganization, memberships, setOrganization, createOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    try {
      await createOrganization(newOrgName);
      setShowCreateModal(false);
      setNewOrgName('');
    } catch (error) {
      console.error(error);
      alert('Failed to establish new organization node.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return (
    <div className="h-12 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
  );

  return (
    <div className="relative">
      <button 
        id="org-switcher-button"
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
                 <button 
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                >
                    <Plus size={12} /> Create
                 </button>
                 <button className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                    <History size={12} /> Search
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Organization Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
            >
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="font-black text-2xl tracking-tighter text-slate-900 italic">Establish Node</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 font-mono">Multi-Tenant Core Isolation Protocol</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">Workspace Identity</label>
                    <input 
                      autoFocus
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700"
                      placeholder="e.g. Acme Agency"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-3 px-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isCreating}
                      type="submit"
                      className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : 'Deploy'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
