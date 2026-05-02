import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { Plus, Search, Mail, Phone, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
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
  }, []);

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (!error && data) setClients(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { user_id: user.id, name, email, phone };

    if (editingId) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editingId);
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
    if (!confirm('Are you sure? All associated invoices will also be affected.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
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
        <button 
          onClick={() => openModal()}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus size={14} />
          <span>New Counterparty</span>
        </button>
      </div>

      {/* Clients List */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Entity Name</th>
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
