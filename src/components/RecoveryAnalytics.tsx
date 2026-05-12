import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { recoveryService } from '../lib/recoveryService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';

export default function RecoveryAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { plan } = usePlan();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    async function loadStats() {
      if (!currentOrganization) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const data = await recoveryService.getRecoveryStats(currentOrganization.id);
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, [currentOrganization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const chartData = [
    { name: 'Recovered', value: stats.recoveredRevenue, color: '#4F46E5' },
    { name: 'At Risk', value: stats.moneyAtRisk, color: '#EF4444' }
  ];

  const effectivenessData = [
    { name: 'Gentle', value: 45, color: '#818CF8' },
    { name: 'Firm', value: 30, color: '#F59E0B' },
    { name: 'Final', value: 15, color: '#EF4444' },
    { name: 'Organic', value: 10, color: '#10B981' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Recovery Velocity"
          value={`${stats.avgRecoveryDays.toFixed(1)} Days`}
          subtitle="Avg. time to payment"
          icon={<Clock className="text-indigo-600" size={20} />}
          trend="+12%"
          trendUp={false}
        />
        <StatsCard 
          title="Success Index"
          value={`${stats.successRate.toFixed(1)}%`}
          subtitle="Conversion of overdue"
          icon={<ShieldCheck className="text-green-600" size={20} />}
          trend="+5.2%"
          trendUp={true}
        />
        <StatsCard 
          title="Recovery Efficiency"
          value="84%"
          subtitle="Automated nudge impact"
          icon={<Zap className="text-orange-500" size={20} />}
          trend="+8%"
          trendUp={true}
        />
        <StatsCard 
          title="Money Safe"
          value={formatCurrency(stats.recoveredRevenue)}
          subtitle="Total revenue recovered"
          icon={<CheckCircle className="text-indigo-600" size={20} />}
          trend={`vs ${formatCurrency(stats.moneyAtRisk)} at risk`}
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-slate-900">Recovery Composition</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recovered vs at-risk revenue</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400">Recovered</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <span className="text-[10px] font-black uppercase text-slate-400">At Risk</span>
               </div>
            </div>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                 <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                   tickFormatter={(val) => `₹${val/1000}k`}
                 />
                 <Tooltip 
                   cursor={{ fill: '#F8FAFC' }}
                   contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
           <div className="mb-8">
              <h3 className="text-xl font-black italic tracking-tighter text-slate-900">Nudge Impact</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Reminders that trigger payment</p>
           </div>
           <div className="flex-1 flex items-center justify-center min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={effectivenessData}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {effectivenessData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-8 space-y-3">
             {effectivenessData.map((item) => (
               <div key={item.name} className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{item.name}</span>
                 </div>
                 <span className="text-sm font-black text-slate-900 italic tracking-tighter">{item.value}%</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon, trend, trendUp }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 hover:scale-[1.02] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
          {icon}
        </div>
        <div className={cn(
          "px-2 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase flex items-center gap-1",
          trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
           {trendUp ? <TrendingUp size={10} /> : <Clock size={10} />}
           {trend}
        </div>
      </div>
      <div>
        <h4 className="text-3xl font-black tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors">{value}</h4>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</p>
          <p className="text-[9px] font-bold text-slate-400 italic">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
