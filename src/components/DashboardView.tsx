import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, Client } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function DashboardView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });
      
      if (!error && data) setInvoices(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  // Business Rule: Computed Overdue Status
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const overdueCount = invoices.filter(i => {
    const dueDate = new Date(i.due_date);
    return i.status !== 'paid' && dueDate < now;
  }).length;

  const isOverdue = (invoice: Invoice) => {
    const dueDate = new Date(invoice.due_date);
    return invoice.status !== 'paid' && dueDate < now;
  };

  const chartData = [
    { name: 'Paid', amount: totalPaid },
    { name: 'Outstanding', amount: totalOutstanding },
  ];

  if (loading) return <div className="animate-pulse flex flex-col space-y-4">
    <div className="h-32 bg-gray-100 rounded-xl"></div>
    <div className="h-64 bg-gray-100 rounded-xl"></div>
  </div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Invoices Card */}
        <div className="col-span-12 lg:col-span-8 bento-card p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-slate-800 text-lg tracking-tight">Recent Invoices</h2>
              <p className="text-sm text-slate-500">Auto-tracked from your connected clients</p>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all shadow-indigo-100 active:scale-95">
              + Create New
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-widest font-mono">
                <tr className="h-10">
                  <th className="px-2">Invoice ID</th>
                  <th className="px-2">Client</th>
                  <th className="px-2">Amount</th>
                  <th className="px-2">Due Date</th>
                  <th className="px-2">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id} className="h-14 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-2 font-mono text-slate-400 text-xs">#{invoice.invoice_number}</td>
                    <td className="px-2 font-semibold text-slate-700">{invoice.client?.name}</td>
                    <td className="px-2 font-bold">{formatCurrency(invoice.amount)}</td>
                    <td className="px-2 text-slate-500">{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td className="px-2">
                       <span className={cn(
                         "status-chip",
                         invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                         isOverdue(invoice) ? 'bg-red-100 text-red-700' :
                         invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                       )}>
                         {invoice.status === 'paid' ? 'paid' : (isOverdue(invoice) ? 'overdue' : invoice.status)}
                       </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100 border-dashed">
                          <FileText size={32} />
                        </div>
                        <p className="text-slate-400 italic mb-4">No ledgers in flight.</p>
                        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                          Create Your First Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {invoices.length > 5 && (
            <button className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex justify-center items-center gap-1 group">
              View All History
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Top Right: Outstanding */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card p-6 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Outstanding</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tighter">{formatCurrency(totalOutstanding)}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            <span>+{Math.round((totalOutstanding/(totalPaid+totalOutstanding || 1))*100)}% of total volume</span>
            <span className="text-indigo-600 cursor-pointer hover:underline">Remind All</span>
          </div>
        </div>

        {/* Middle Right: Collection Rate */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card p-6 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Collection Rate</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tighter">
                {totalPaid + totalOutstanding > 0 ? Math.round((totalPaid / (totalPaid + totalOutstanding)) * 100) : 0}%
              </h3>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform duration-300">
               <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
            <div 
              className="bg-green-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${totalPaid + totalOutstanding > 0 ? (totalPaid / (totalPaid + totalOutstanding)) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Bottom Left: Revenue Chart */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card p-6">
          <h4 className="font-bold text-sm text-slate-700 mb-6 flex justify-between items-center group">
            Revenue Metrics
             <TrendingUp size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </h4>
          <div className="flex items-end gap-2 h-32 mb-4">
            <div className="flex-1 bg-slate-100 rounded h-[40%] transition-all hover:bg-slate-200"></div>
            <div className="flex-1 bg-slate-100 rounded h-[60%] transition-all hover:bg-slate-200"></div>
            <div className="flex-1 bg-slate-100 rounded h-[35%] transition-all hover:bg-slate-200"></div>
            <div className="flex-1 bg-slate-100 rounded h-[80%] transition-all hover:bg-slate-200"></div>
            <div className="flex-1 bg-indigo-500 rounded h-[95%] shadow-lg shadow-indigo-100"></div>
            <div className="flex-1 bg-slate-200 rounded h-[70%]"></div>
            <div className="flex-1 bg-slate-100 rounded h-[50%]"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
            <span>May</span><span>Jun</span><span className="text-indigo-600">Jul</span><span>Aug</span>
          </div>
        </div>

        {/* Bottom Center: System Integrity */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card bg-slate-900 border-none p-6 text-white group">
          <h4 className="font-bold text-sm mb-1">System Integrity</h4>
          <p className="text-[10px] text-slate-400 font-mono mb-6 uppercase">Sync stable • 24ms latency</p>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:rotate-12 transition-all duration-300">
                <CheckCircle2 size={18} className="text-indigo-400 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 w-full rounded-full animate-pulse"></div>
                </div>
                <p className="text-[10px] mt-1.5 text-slate-400 font-mono uppercase">Security Layer Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp size={18} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold leading-none">Supabase Cloud</p>
                <p className="text-[10px] text-green-400 mt-1 font-mono uppercase italic">Operational Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  trend: string
}) {
  return (
    <div className="card p-6 group hover:border-black transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="p-2 bg-gray-50 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
          {icon}
        </span>
        <TrendingUp size={16} className="text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider font-mono">{title}</p>
        <h4 className="text-2xl font-bold tracking-tight mt-1">{value}</h4>
        <p className="text-[10px] text-gray-400 mt-2 font-mono">{trend}</p>
      </div>
    </div>
  );
}
