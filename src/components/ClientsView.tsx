import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { Plus, Search, Mail, Phone, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { RiskBadge } from './RiskBadge';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';

export default function ClientsView() {
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageInvoices: false } } = useUserRole() || {};
  const canWrite = capabilities.canManageInvoices; // In our roles, anyone who can manage invoices can manage clients
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { 
      user_id: user.id, 
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search Counterparties..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:border-indigo-600 outline-none transition-all text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 shadow-sm"
          />
        </div>
        {canWrite && (
          <button 
            onClick={() => openModal()}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <Plus size={14} />
            <span>New Counterparty</span>
          </button>
        )}
      </div>

      {/* Clients List */}
      <div className="hidden md:block bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Entity Name</th>
                <th className="px-5 py-2.5 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Risk Profile</th>
                <th className="px-5 py-2.5 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Contact Node</th>
                <th className="px-5 py-2.5 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-indigo-50/30 transition-all group h-14">
                  <td className="px-5 py-3 tracking-tighter">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white italic shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform shrink-0">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight text-sm leading-none">{client.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Counterparty Node</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <RiskBadge level={client.risk_score as any} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <Mail size={10} className="mr-1.5 text-indigo-500 opacity-60" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                          <Phone size={10} className="mr-1.5 text-indigo-500 opacity-60" />
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
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteClient(client.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="text-[8px] font-black uppercase text-slate-300">Read Only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* SECTION 2: EMPTY STATE */}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-24 px-6 text-center">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 border-dashed mb-6">
                        <Mail size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2 italic">No clients yet</h3>
                      <p className="text-slate-400 text-sm font-medium mb-8">Add your first client to start invoicing</p>
                      <button 
                        onClick={() => openModal()}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-50 hover:bg-slate-900 transition-all"
                      >
                        Add Client
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
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white italic shadow-lg shadow-slate-200 shrink-0">
                  {client.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{client.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Counterparty</p>
                </div>
              </div>
              <RiskBadge level={client.risk_score as any} />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-xs text-slate-600">
                <Mail size={12} className="mr-2 text-indigo-500 opacity-60" />
                <span className="truncate">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center text-xs text-slate-600">
                  <Phone size={12} className="mr-2 text-indigo-500 opacity-60" />
                  <span>{client.phone}</span>
                </div>
              )}
            </div>

            {canWrite && (
              <div className="flex gap-2">
                <button 
                  onClick={() => openModal(client)}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center justify-center gap-2"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button 
                  onClick={() => deleteClient(client.id)}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center justify-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="py-12 px-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
             <Mail className="mx-auto text-slate-300 mb-4" size={40} />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No clients found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl tracking-tighter text-slate-900 italic">{editingId ? 'Edit Counterparty' : 'Anchor New Node'}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Counterparty Identification Protocol</p>
              </div>
              <button onClick={closeModal} className="p-1.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <Plus size={16} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">Entity Name</label>
                <input 
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">Communication Node (Email)</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 text-sm"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">Voice Uplink (Optional)</label>
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 text-sm font-mono"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-900 transition-all active:scale-95 shadow-xl shadow-indigo-100"
                >
                  {editingId ? 'Push Update' : 'Establish Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
