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
      alert('Failed to establish new organization workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return (
    <div className="h-12 w-full bg-[#161616] animate-pulse rounded-2xl border border-[#222222]"></div>
  );

  return (
    <div className="relative">
      <button 
        id="org-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 bg-[#161616] border border-[#222222] rounded-2xl flex items-center justify-between hover:bg-[#1f1f1f] hover:border-[#333333] transition-all group overflow-hidden"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-7 h-7 bg-[#222222] border border-[#333333] rounded-lg flex items-center justify-center text-[#C8FF00] shrink-0 font-bold">
             <Building2 size={13} />
          </div>
          <div className="text-left overflow-hidden">
             <p className="text-[10px] font-black uppercase text-[#888888] tracking-widest leading-none mb-1 group-hover:text-[#C8FF00] transition-colors font-mono">Workspace</p>
             <p className="text-[11px] font-black text-[#EEEEEE] truncate tracking-tight">{currentOrganization?.name || 'Loading...'}</p>
          </div>
        </div>
        <ChevronDown size={14} className={cn("text-[#888888] transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-3 p-3 bg-[#111111] border border-[#222222] rounded-[2rem] shadow-2xl z-50 overflow-hidden"
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
                      "w-full p-4 rounded-2xl flex items-center justify-between transition-all group border border-transparent",
                      m.organization_id === currentOrganization?.id 
                        ? "bg-[#161616] text-[#EEEEEE] border-[#222222] shadow-xl" 
                        : "hover:bg-[#161616]/50 text-[#888888] hover:text-[#EEEEEE]"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                       <div className={cn(
                         "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold border",
                         m.organization_id === currentOrganization?.id 
                           ? "bg-[#222222] border-[#333333] text-[#C8FF00]" 
                           : "bg-[#181818] border-[#222222] text-[#888888]"
                       )}>
                          <span className="text-[10px] font-black uppercase">{m.organization?.name?.[0]}</span>
                       </div>
                       <div className="text-left overflow-hidden">
                          <p className={cn(
                            "text-[10px] font-black truncate",
                            m.organization_id === currentOrganization?.id ? "text-[#EEEEEE]" : "text-[#888888] group-hover:text-[#EEEEEE]"
                          )}>{m.organization?.name}</p>
                          <p className={cn(
                            "text-[8px] font-black uppercase tracking-widest leading-none mt-0.5 font-mono",
                            m.organization_id === currentOrganization?.id ? "text-[#C8FF00]" : "text-[#555555]"
                          )}>{m.role}</p>
                       </div>
                    </div>
                    {m.organization_id === currentOrganization?.id && (
                      <Check size={14} className="text-[#C8FF00]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-[#222222] grid grid-cols-2 gap-2">
                 <button 
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-[#888888] hover:text-[#EEEEEE] hover:bg-[#161616]/50 rounded-xl transition-all font-mono"
                >
                    <Plus size={12} className="text-[#C8FF00]" /> Create
                 </button>
                 <button className="flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase tracking-widest text-[#888888] hover:text-[#EEEEEE] hover:bg-[#161616]/50 rounded-xl transition-all font-mono">
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
              className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111111] w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-[#222222]"
            >
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="font-black text-2xl tracking-tighter text-[#EEEEEE] italic uppercase">Create Workspace</h3>
                  <p className="text-[10px] font-black text-[#888888] uppercase tracking-widest mt-1 font-mono">Multi-Tenant Isolation Protocol</p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4 font-mono">
                  <div>
                    <label className="block text-[9px] font-black text-[#888888] uppercase tracking-widest mb-1.5 px-1 font-mono">Workspace Identity</label>
                    <input 
                      autoFocus
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full px-5 py-3 bg-[#161616] border border-[#222222] rounded-2xl focus:border-[#C8FF00] focus:bg-[#161616] outline-none transition-all font-bold text-[#EEEEEE]"
                      placeholder="e.g. Acme Agency"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-3 px-4 bg-[#161616] hover:bg-[#222222] text-[#888888] rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border border-[#222222]"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isCreating}
                      type="submit"
                      className="flex-1 py-3 px-4 bg-[#C8FF00] text-[#080808] rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#b8ef00] transition-all flex items-center justify-center gap-2 font-mono"
                    >
                      {isCreating ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#080808] border-t-transparent rounded-full animate-spin"></div>
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
