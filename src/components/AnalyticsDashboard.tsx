import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Bot, 
  ShieldCheck, 
  Calendar,
  ChevronDown,
  ArrowRight,
  Filter,
  RefreshCw,
  MoreVertical,
  ArrowUpRight,
  Send,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart,
  Bar,
  Cell,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Indian Currency Formatter
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

// Formatter for truncated values (1K, 1L, etc)
const formatCompact = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
};

const PERIODS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 12 months', value: 365 },
];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'amber' | 'red' | 'green' | 'blue' | 'purple' | 'indigo';
  loading?: boolean;
}

const MetricCard = ({ title, value, subtitle, icon, color, loading }: MetricCardProps) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
        <div className="w-10 h-10 bg-slate-100 rounded-xl mb-4" />
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
        <div className="h-8 bg-slate-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110", colorClasses[color])}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1 italic">{value}</h3>
      <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
      <div className={cn("absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 blur-2xl", colorClasses[color].split(' ')[0])} />
    </div>
  );
};

export default function AnalyticsDashboard() {
  const { currentOrganization } = useOrganization();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data States
  const [overview, setOverview] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);
  const [clientStats, setClientStats] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    setError(null);
    
    try {
      const [
        { data: overviewData },
        { data: revenueData },
        { data: trendData },
        { data: recoveryData },
        { data: clientsData },
        { data: forecastData }
      ] = await Promise.all([
        supabase.rpc('get_overview_stats', { p_org_id: currentOrganization.id }),
        supabase.rpc('get_revenue_analytics', { p_org_id: currentOrganization.id, p_days: days }),
        supabase.rpc('get_revenue_trend', { p_org_id: currentOrganization.id, p_days: days }),
        supabase.rpc('get_recovery_analytics', { p_org_id: currentOrganization.id, p_days: days }),
        supabase.rpc('get_client_analytics', { p_org_id: currentOrganization.id, p_days: days }),
        supabase.rpc('get_cashflow_forecast', { p_org_id: currentOrganization.id })
      ]);

      setOverview(overviewData);
      setRevenueStats(revenueData);
      setRevenueTrend(trendData || []);
      setRecoveryStats(recoveryData);
      setClientStats(clientsData || []);
      setForecast(forecastData || []);
    } catch (err: any) {
      console.error('Analytics Fetch Error:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentOrganization, days]);

  const recoveryRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-500';
    if (rate >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const reliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'excellent': return 'bg-green-50 text-green-600 border-green-100';
      case 'good': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'fair': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'poor': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const emptyState = useMemo(() => {
    return !loading && (!revenueTrend || revenueTrend.length === 0 || revenueTrend.every(d => d.invoiced === 0 && d.collected === 0));
  }, [revenueTrend, loading]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Data Sync Issue</h2>
        <p className="text-slate-500 mb-8 max-w-sm">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-1">Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium">Insights into your revenue and recovery performance</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => setDays(period.value)}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                days === period.value ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {emptyState ? (
        <div className="bg-white rounded-[3rem] p-12 md:p-24 border border-slate-100 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8">
            <BarChart2 size={48} className="text-slate-200" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tight">No Insights Yet</h2>
          <p className="text-slate-500 max-w-md mb-10 text-sm leading-relaxed font-medium">
            Once you start sending invoices and receiving payments, we'll crunch the numbers and show your growth trends right here.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-invoice-modal'))}
            className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:scale-[1.02] transition-all shadow-xl shadow-slate-200 border-none inline-flex items-center gap-3"
          >
            Create Your First Invoice
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <MetricCard 
              title="Total Outstanding"
              value={formatCurrency(overview?.total_outstanding || 0)}
              subtitle={`Across ${revenueStats?.invoices_overdue + revenueStats?.invoices_sent || 0} invoices`}
              icon={<Clock size={24} />}
              color="amber"
              loading={loading}
            />
            <MetricCard 
              title="Overdue Amount"
              value={formatCurrency(overview?.overdue_amount || 0)}
              subtitle="Requires immediate action"
              icon={<AlertCircle size={24} />}
              color="red"
              loading={loading}
            />
            <MetricCard 
              title="Collected Month"
              value={formatCurrency(overview?.collected_this_month || 0)}
              subtitle="Calendar month to date"
              icon={<CheckCircle2 size={24} />}
              color="green"
              loading={loading}
            />
            <MetricCard 
              title="Active Recoveries"
              value={`${overview?.active_recoveries || 0} sequences`}
              subtitle="Automated follow-ups"
              icon={<Bot size={24} />}
              color="blue"
              loading={loading}
            />
            <MetricCard 
              title="Total Clients"
              value={overview?.clients_count || 0}
              subtitle="Client relationships"
              icon={<Users size={24} />}
              color="purple"
              loading={loading}
            />
            <MetricCard 
              title="Success Rate (30d)"
              value={`${Math.round(overview?.success_rate_30d || 0)}%`}
              subtitle="Paid within 30 days"
              icon={<ShieldCheck size={24} />}
              color="indigo"
              loading={loading}
            />
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic mb-2">Revenue & Collection Trend</h3>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Growth vs Collection Velocity</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoiced</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Collected</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="period_date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => formatCompact(val)}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '10px' }}
                      formatter={(val: number) => [formatCurrency(val), '']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="invoiced" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorInvoiced)" />
                    <Area type="monotone" dataKey="collected" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recovery Performance */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic mb-8">Recovery Performance</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Created</span>
                    <span className="text-xs font-black text-slate-900">{recoveryStats?.sequences_created || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed</span>
                    <span className="text-xs font-black text-slate-900">{recoveryStats?.sequences_completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emails Sent</span>
                    <span className="text-xs font-black text-slate-900">{recoveryStats?.emails_sent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed</span>
                    <span className={cn("text-xs font-black", recoveryStats?.emails_failed > 0 ? "text-red-500" : "text-slate-900")}>
                      {recoveryStats?.emails_failed || 0}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recovery Rate</p>
                  <h4 className={cn("text-4xl font-black italic mb-1", recoveryRateColor(recoveryStats?.recovery_rate || 0))}>
                    {Math.round(recoveryStats?.recovery_rate || 0)}%
                  </h4>
                  <p className="text-[9px] font-black text-slate-400 italic">Target: 85%+</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-8 text-white mt-auto">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Template Success</p>
                  <p className="text-[10px] font-black text-slate-400 italic">Best: <span className="text-white capitalize">{recoveryStats?.best_performing_template?.replace('_', ' ') || 'none'}</span></p>
                </div>
                
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={[
                      { name: 'Polite', rate: 84 },
                      { name: 'Firm', rate: 52 },
                      { name: 'Final', rate: 31 }
                    ]} margin={{ left: -20, right: 20 }}>
                      <RechartsXAxis type="number" hide />
                      <RechartsYAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#fff', fontSize: 10, fontWeight: 900 }} 
                      />
                      <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={20}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send size={12} className="text-indigo-400" />
                    <span className="text-[9px] font-medium text-slate-400">Avg Steps: <span className="text-white font-black">{recoveryStats?.avg_steps_to_recovery?.toFixed(1) || '0.0'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-indigo-400" />
                    <span className="text-[9px] font-medium text-slate-400">Total Sent: <span className="text-white font-black">{recoveryStats?.total_reminders_sent || 0}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashflow Forecast */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic mb-8">Expected Payments (Next 30 Days)</h3>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {forecast.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                    <Calendar size={32} className="text-slate-200 mb-4" />
                    <p className="text-slate-400 text-sm font-medium">No pending invoices due in the next 30 days.</p>
                  </div>
                ) : (
                  forecast.map((item, idx) => {
                    const isOverdue = new Date(item.forecast_date) < new Date();
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-indigo-100 group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-center flex-col shrink-0",
                            isOverdue ? "bg-red-50 text-red-600" : "bg-white text-slate-900"
                          )}>
                            <span>{new Date(item.forecast_date).getDate()}</span>
                            <span className="text-[8px] opacity-70">{new Date(item.forecast_date).toLocaleString('default', { month: 'short' })}</span>
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 mb-0.5">{formatCurrency(item.expected_amount)}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.invoice_count} Invoices</p>
                          </div>
                        </div>
                        {isOverdue && (
                          <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest">Overdue</div>
                        )}
                        <ArrowRight size={14} className="text-slate-300 transition-transform group-hover:translate-x-1" />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">Total Pipeline</p>
                  <h4 className="text-2xl font-black text-white italic tracking-tight">
                    {formatCurrency(forecast.reduce((acc, curr) => acc + Number(curr.expected_amount), 0))}
                  </h4>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <TrendingUp size={24} className="text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Client Performance Table */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Client Payment Performance</h3>
              <div className="px-4 py-2 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                Top 20 Clients
              </div>
            </div>

            <div className="overflow-x-auto -mx-8">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Client</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Invoiced</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Paid</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Outstanding</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Invoices</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Avg Pay (Days)</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Reliability</th>
                  </tr>
                </thead>
                <tbody>
                  {clientStats.map((client, idx) => (
                    <tr key={idx} className="border-b last:border-0 border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-900 tracking-tight mb-0.5">{client.client_name}</p>
                        <p className="text-[10px] font-medium text-slate-400 font-mono truncate max-w-[200px]">{client.client_email}</p>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 text-sm italic">{formatCurrency(client.total_invoiced)}</td>
                      <td className="px-8 py-6 text-right font-black text-green-600 text-sm italic">{formatCurrency(client.total_paid)}</td>
                      <td className="px-8 py-6 text-right font-black text-amber-600 text-sm italic">{formatCurrency(client.outstanding)}</td>
                      <td className="px-8 py-6 text-center text-xs font-black text-slate-500">{client.invoice_count}</td>
                      <td className="px-8 py-6 text-center text-xs font-black text-slate-500">{parseFloat(client.avg_days_to_pay).toFixed(1)}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border inline-block whitespace-nowrap",
                          reliabilityColor(client.payment_reliability)
                        )}>
                          {client.payment_reliability}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden space-y-4">
              {clientStats.map((client, idx) => (
                <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-tight italic mb-1">{client.client_name}</p>
                      <p className="text-[10px] font-medium text-slate-400 font-mono">{client.client_email}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border",
                      reliabilityColor(client.payment_reliability)
                    )}>
                      {client.payment_reliability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-center border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Outstanding</p>
                      <p className="text-xs font-black text-amber-600 italic">{formatCurrency(client.outstanding)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg Pay</p>
                      <p className="text-xs font-black text-slate-900 italic">{parseFloat(client.avg_days_to_pay).toFixed(1)}d</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
