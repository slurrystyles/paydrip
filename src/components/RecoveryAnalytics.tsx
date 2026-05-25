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
      <div className="flex items-center justify-center h-64 animate-pulse">
        <div className="w-8 h-8 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin"></div>
      </div>
    );
  }

  const chartData = [
    { name: 'Recovered', value: stats.recoveredRevenue, color: '#C8FF00' },
    { name: 'At Risk', value: stats.moneyAtRisk, color: '#EF4444' }
  ];

  const effectivenessData = [
    { name: 'Gentle', value: 45, color: '#3B82F6' },
    { name: 'Firm', value: 30, color: '#F59E0B' },
    { name: 'Final', value: 15, color: '#EF4444' },
    { name: 'Direct Paid', value: 10, color: '#10B981' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in transition-all duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Recovery Velocity"
          value={`${stats.avgRecoveryDays.toFixed(1)} Days`}
          subtitle="Avg. days to collection"
          icon={<Clock className="text-[#3B82F6]" size={16} />}
          trend="+12%"
          trendUp={false}
        />
        <StatsCard 
          title="Success Index"
          value={`${stats.successRate.toFixed(1)}%`}
          subtitle="Reminders settled"
          icon={<ShieldCheck className="text-[#10B981]" size={16} />}
          trend="+5.2%"
          trendUp={true}
        />
        <StatsCard 
          title="Nudge Efficiency"
          value="84%"
          subtitle="Reminders converted"
          icon={<Zap className="text-[#F59E0B]" size={16} />}
          trend="+8%"
          trendUp={true}
        />
        <StatsCard 
          title="Money Safe"
          value={formatCurrency(stats.recoveredRevenue)}
          subtitle="Total recovered"
          icon={<CheckCircle className="text-[#C8FF00]" size={16} />}
          trend={`vs ${formatCurrency(stats.moneyAtRisk)} at risk`}
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
        <div className="lg:col-span-2 bg-[#111111] p-6 border border-[#222222] rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#222222]">
            <div>
              <h3 className="text-base font-semibold text-[#EEEEEE]">Recovery Composition</h3>
              <p className="text-[10px] uppercase font-mono text-[#888888] mt-0.5">Recovered vs active exposure</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF00]"></div>
                 <span className="text-[10px] font-semibold uppercase text-[#888888]">Recovered</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></div>
                 <span className="text-[10px] font-semibold uppercase text-[#888888]">At Risk</span>
               </div>
            </div>
          </div>
          
          <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222222" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888888', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888888', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(val) => `₹${val/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#161616' }}
                    contentStyle={{ backgroundColor: '#111111', borderColor: '#222222', borderRadius: '8px', color: '#EEEEEE' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={44}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111111] p-6 border border-[#222222] rounded-xl flex flex-col justify-between">
           <div>
              <h3 className="text-base font-semibold text-[#EEEEEE]">Nudge Efficiency</h3>
              <p className="text-[10px] uppercase font-mono text-[#888888] mt-0.5">Reminders that trigger payment</p>
           </div>
           
           <div className="flex-1 flex items-center justify-center min-h-[180px]">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={effectivenessData}
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
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
           
           <div className="space-y-2 border-t border-[#222222] pt-4">
             {effectivenessData.map((item) => (
               <div key={item.name} className="flex items-center justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-[11px] text-[#888888] font-mono">{item.name}</span>
                 </div>
                 <span className="text-xs font-semibold text-[#EEEEEE] font-mono">{item.value}%</span>
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
    <div className="bg-[#111111] border border-[#222222] p-5 rounded-xl text-left hover:border-[#333333] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 bg-[#161616] border border-[#222222] rounded-lg flex items-center justify-center transition-colors">
          {icon}
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1",
          trendUp ? "bg-[#10B98115] text-[#10B981]" : "bg-[#EF444415] text-[#EF4444]"
        )}>
           {trend}
        </div>
      </div>
      <div>
        <h4 className="text-2xl font-bold text-[#EEEEEE] group-hover:text-[#C8FF00] transition-colors">{value}</h4>
        <div className="flex items-center justify-between mt-1 text-xs">
          <p className="font-semibold text-[#888888] uppercase tracking-wider text-[10px]">{title}</p>
          <p className="text-[10px] text-[#444444] font-mono">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
