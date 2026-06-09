'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Clock, Activity } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getApiUrl } from '@/lib/api';

const PIE_COLORS = { CODE_RED: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };

export default function AnalyticsTab() {
  const [data, setData] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/analytics/queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (!data) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-slate-400 text-sm">Loading analytics...</div>
    </div>
  );

  const pieData = (data.byPriority || []).map((p: any) => ({
    name: p.priority.replace('_', ' '),
    value: p._count,
    color: PIE_COLORS[p.priority as keyof typeof PIE_COLORS] || '#94a3b8',
  }));

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Patients Today', value: data.totalToday, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed Today', value: data.completedToday, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Currently Waiting', value: data.currentlyWaiting, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Avg Wait (min)', value: Math.round(data.avgWaitMinutes), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Little's Law Panel */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
        <h2 className="text-lg font-bold mb-1">Little's Law — Queue Theory</h2>
        <p className="text-blue-100 text-sm mb-5">L = λW &nbsp;|&nbsp; Avg patients in system = Arrival rate × Avg wait time</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'λ Arrival Rate', value: `${data.littlesLaw.arrivalRatePerHour}/hr`, desc: 'Patients per hour' },
            { label: 'W Avg Wait', value: `${data.littlesLaw.avgWaitMinutes} min`, desc: 'Average wait time' },
            { label: 'L Patients in System', value: data.littlesLaw.avgPatientsInSystem, desc: 'L = λ × W' },
          ].map(item => (
            <div key={item.label} className="bg-white/15 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide">{item.label}</p>
              <p className="text-3xl font-bold mt-1">{item.value}</p>
              <p className="text-blue-200 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Arrivals Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Hourly Arrivals (Last 8 Hours)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.hourlyData || []}>
              <defs>
                <linearGradient id="arrivals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Area type="monotone" dataKey="arrivals" stroke="#3b82f6" strokeWidth={2} fill="url(#arrivals)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Priority Breakdown (Today)</h3>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
