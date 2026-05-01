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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search Counterparties..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-indigo-600 outline-none transition-all text-xs font-black uppercase tracking-widest placeholder:text-slate-300 shadow-sm"
          />
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus size={16} />
          <span>New Counterparty</span>
        </button>
      </div>

      {/* Clients List */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Entity Name</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Contact Node</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-indigo-50/30 transition-all group">
                  <td className="px-6 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white italic shadow-lg shadow-slate-200">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 tracking-tight leading-none">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Node Active Since {new Date(client.created_at).getFullYear()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Mail size={12} className="mr-2 text-indigo-500 opacity-60" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <Phone size={12} className="mr-2 text-indigo-500 opacity-60" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openModal(client)}
                        className="p-2 text-gray-400 hover:text-black transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteClient(client.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">
                    {searchTerm ? 'No clients match your search.' : 'No clients added yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Client' : 'New Client'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-black transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                <input 
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none"
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone (Optional)</label>
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-all"
                >
                  {editingId ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
