import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { Plus, Search, Mail, Phone, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { RiskBadge } from './RiskBadge';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';
import { usePlan } from '../contexts/PlanContext';

export default function ClientsView() {
  const { profile } = usePlan();
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageInvoices: false } } = useUserRole() || {};
  const canWrite = capabilities.canManageInvoices; 
  const [clients, setClients] = useState<(Client & { risk_score?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, [currentOrganization]);

  async function fetchClients() {
    if (!currentOrganization) return;
    if (!profile) return;

    const [clientsRes, riskRes] = await Promise.all([
      supabase.from('clients').select('*').eq('organization_id', currentOrganization.id).order('name'),
      supabase.from('client_risk_scores').select('*').eq('organization_id', currentOrganization.id)
    ]);
    
    if (!clientsRes.error && clientsRes.data) {
      const clientsWithRisk = clientsRes.data.map(client => {
        const risk = riskRes.data?.find(r => r.client_id === client.id);
        return {
          ...client,
          risk_score: risk?.risk_score || 'low'
        };
      });
      setClients(clientsWithRisk);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganization) return;
    if (!profile) return;

    const payload = { 
      user_id: profile.id, 
      organization_id: currentOrganization.id,
      name, 
      email, 
      phone 
    };

    if (editingId) {
      const { error } = await supabase
         .from('clients')
         .update(payload)
         .eq('id', editingId)
         .eq('organization_id', currentOrganization.id);
      if (!error) {
        setClients(clients.map(c => c.id === editingId ? { ...c, ...payload } : c));
      }
    } else {
      const { data, error } = await supabase
         .from('clients')
         .insert([payload])
         .select();
      if (!error && data) {
        setClients([...clients, data[0]]);
      }
    }

    closeModal();
  }

  async function deleteClient(id: string) {
    if (!currentOrganization) return;
    if (!confirm('Are you sure? All associated invoices will also be affected.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('organization_id', currentOrganization.id);
    if (!error) {
      setClients(clients.filter(c => c.id !== id));
    }
  }

  function openModal(client?: Client) {
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setPhone(client.phone || '');
      setEditingId(client.id);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setEditingId(null);
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setEditingId(null);
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444444] group-focus-within:text-[#C8FF00] transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search Counterparties..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-[#111111] border border-[#222222] rounded-lg focus:border-[#444444] outline-none transition-all text-xs font-medium text-[#EEEEEE] placeholder:text-[#444444]"
          />
        </div>
        {canWrite && (
          <button 
            onClick={() => openModal()}
            className="bg-[#C8FF00] text-[#080808] px-4 py-2 rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 hover:bg-[#b8ef00] transition-all"
          >
            <Plus size={14} />
            <span>New Counterparty</span>
          </button>
        )}
      </div>

      {/* Clients List Table */}
      <div className="hidden md:block bento-card overflow-hidden bg-[#111111] border border-[#222222] rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#161616] border-b border-[#222222]">
                <th className="px-5 py-3 text-xs font-mono font-medium text-[#888888] uppercase tracking-wider">Entity Name</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-[#888888] uppercase tracking-wider">Risk Profile</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-[#888888] uppercase tracking-wider">Contact Details</th>
                <th className="px-5 py-3 text-xs font-mono font-medium text-[#888888] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]/50 text-xs">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-[#161616]/30 transition-all group h-14">
                  <td className="px-5 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-xs font-semibold text-[#EEEEEE] shrink-0">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#EEEEEE] text-sm leading-none">{client.name}</p>
                        <p className="text-[10px] text-[#444444] font-semibold uppercase tracking-wider mt-1">Counterparty</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <RiskBadge level={client.risk_score as any} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-1 text-[#888888]">
                      <div className="flex items-center text-[11px] font-mono">
                        <Mail size={12} className="mr-1.5 text-[#888888]/60" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center text-[11px] font-mono">
                          <Phone size={12} className="mr-1.5 text-[#888888]/60" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {canWrite ? (
                        <>
                          <button 
                            onClick={() => openModal(client)}
                            className="p-1.5 text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1a1a1a] rounded-lg border border-transparent hover:border-[#222222] transition-all"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => deleteClient(client.id)}
                            className="p-1.5 text-[#888888] hover:text-[#EF4444] hover:bg-[#EF444410] rounded-lg border border-transparent hover:border-[#EF444420] transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-mono uppercase text-[#444444]">Read Only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 px-6 text-center">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="w-12 h-12 bg-[#161616] border border-[#222222] rounded-xl flex items-center justify-center text-[#888888] mb-4">
                        <Mail size={22} />
                      </div>
                      <h3 className="text-base font-semibold text-[#EEEEEE] mb-1">No counterparties found</h3>
                      <p className="text-[#888888] text-xs font-normal mb-6">Add a counterparty to start issuing invoices.</p>
                      <button 
                        onClick={() => openModal()}
                        className="bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] px-4 py-2 rounded-lg font-semibold text-xs transition-all"
                      >
                        Add Counterparty
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {filteredClients.map((client) => (
          <div 
            key={client.id}
            className="bg-[#111111] border border-[#222222] rounded-xl p-4 text-left"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-xs font-semibold text-[#EEEEEE] shrink-0">
                  {client.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#EEEEEE] truncate text-sm">{client.name}</p>
                  <p className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Counterparty</p>
                </div>
              </div>
              <RiskBadge level={client.risk_score as any} />
            </div>

            <div className="space-y-1.5 mb-4 text-xs text-[#888888]">
              <div className="flex items-center">
                <Mail size={12} className="mr-2 text-[#888888]/60" />
                <span className="truncate font-mono">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center">
                  <Phone size={12} className="mr-2 text-[#888888]/60" />
                  <span className="font-mono">{client.phone}</span>
                </div>
              )}
            </div>

            {canWrite && (
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal(client)}
                  className="flex-1 py-2 bg-[#161616] border border-[#222222] text-[#EEEEEE] hover:bg-[#222222] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={11} />
                  Edit
                </button>
                <button 
                  onClick={() => deleteClient(client.id)}
                  className="flex-1 py-2 bg-[#EF444410] border border-[#EF444420] text-[#EF4444] hover:bg-[#EF444415] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="py-12 px-6 text-center bg-[#111111] border border-[#222222] rounded-xl">
             <Mail className="mx-auto text-[#444444] mb-4" size={32} />
             <p className="text-[#888888] font-semibold tracking-wider text-xs uppercase">No counterparties found</p>
          </div>
        )}
      </div>

      {/* Form Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in transition-all">
          <div className="bg-[#111111] border border-[#222222] w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-left">
            <div className="p-5 border-b border-[#222222] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#EEEEEE]">{editingId ? 'Edit Counterparty' : 'Add New Counterparty'}</h3>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-0.5">Counterparty Details Profile</p>
              </div>
              <button onClick={closeModal} className="p-1 bg-[#161616] border border-[#222222] rounded-lg text-[#888888] hover:text-[#EEEEEE] transition-all">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Entity Name</label>
                <input 
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161616] border border-[#222222] focus:border-[#444444] rounded-lg outline-none transition-all font-semibold text-[#EEEEEE] text-xs"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Contact Email</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161616] border border-[#222222] focus:border-[#444444] rounded-lg outline-none transition-all font-semibold text-[#EEEEEE] text-xs"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Phone Number (Optional)</label>
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161616] border border-[#222222] focus:border-[#444444] rounded-lg outline-none transition-all font-semibold text-xs text-[#EEEEEE] font-mono"
                  placeholder="+1 555-0192"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 px-3 bg-[#161616] border border-[#222222] text-[#888888] hover:text-[#EEEEEE] hover:bg-[#222222] rounded-lg font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 px-3 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg font-semibold text-xs transition-all"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
