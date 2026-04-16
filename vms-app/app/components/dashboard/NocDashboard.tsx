'use client';

import { Activity, Users, Network, Settings, Package, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NocDashboard() {
    const [permits, setPermits] = useState<any[]>([]);
    const [realStats, setRealStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/permits')
            .then(res => res.json())
            .then(data => setPermits(data))
            .catch(err => console.error(err));
            
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => setRealStats(data))
            .catch(err => console.error(err));
    }, []);

    const pendingPermits = permits.filter((p: any) => p.status === 'Pending').slice(0, 5);

    const statsConfig = realStats ? [
        { name: 'Active Visit Permits', value: realStats.activePermits.toString(), change: `+${realStats.todayPermits} today`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { name: 'Racks Utilizing > 80%', value: realStats.racksOver80.toString(), change: realStats.racksOver80 > 0 ? 'critical capacity' : 'Healthy Load', icon: Server, color: realStats.racksOver80 > 0 ? 'text-rose-400' : 'text-emerald-400', bg: realStats.racksOver80 > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10' },
        { name: 'Cross Connects Provisioned', value: realStats.activeCrossConnects.toString(), change: `+${realStats.weekCrossConnects} this week`, icon: Network, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { name: 'Total Downtime Mins (YTD)', value: '0', change: '100% Uptime', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ] : [
        { name: 'Active Visit Permits', value: '-', change: 'Loading...', icon: Users, color: 'text-slate-400', bg: 'bg-slate-500/10' },
        { name: 'Racks Utilizing > 80%', value: '-', change: 'Loading...', icon: Server, color: 'text-slate-400', bg: 'bg-slate-500/10' },
        { name: 'Cross Connects Provisioned', value: '-', change: 'Loading...', icon: Network, color: 'text-slate-400', bg: 'bg-slate-500/10' },
        { name: 'Total Downtime Mins (YTD)', value: '-', change: 'Loading...', icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    ];

    const utilizedPercent = realStats ? realStats.utilizationPercent : 0;
    // Donut chart logic based on percentage (circumference = 502)
    const dashOffset = 502 - (502 * utilizedPercent) / 100;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Regional Overview</h1>
                     <p className="text-muted-foreground mt-1">Live metrics from your Data Center infrastructure.</p>
                 </div>
                 <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                     Generate Weekly Report
                 </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsConfig.map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        key={stat.name} 
                        className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.name}</p>
                                <p className="text-3xl font-bold text-slate-100">{stat.value}</p>
                                <p className={`text-xs mt-2 font-medium ${stat.color}`}>{stat.change}</p>
                            </div>
                            <div className={`${stat.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-125 transition-transform duration-500 pointer-events-none">
                            <stat.icon className="w-32 h-32" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Top Visitors List */}
                 <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-xl lg:col-span-2 min-h-[400px]">
                      <h3 className="text-lg font-semibold text-slate-100 mb-6">Recent Pending Permits</h3>
                      
                      <div className="space-y-4">
                            {pendingPermits.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">No pending permits at the moment.</p>
                            ) : (
                                pendingPermits.map((permit, idx) => (
                                    <Link href="/dashboard/permits" key={permit.id} className="block transition-transform hover:-translate-y-0.5">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-semibold border border-slate-700">
                                                    {permit.customer?.name ? permit.customer.name.substring(0, 2).toUpperCase() : 'NA'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">{permit.customer?.name || permit.companyName || 'Unknown Customer'}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] hover:max-w-full" title={permit.visitorNames}>Visitors: {permit.visitorNames}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className="text-sm text-slate-300">{new Date(permit.scheduledAt).toLocaleDateString()}</p>
                                                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 mt-1">Pending</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                      </div>
                 </div>

                 {/* Capacity Donut Chart */}
                 <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-xl flex flex-col">
                      <h3 className="text-lg font-semibold text-slate-100 mb-6">Total Rack Capacity</h3>
                      <div className="flex-1 flex items-center justify-center relative">
                          <svg className="w-48 h-48 transform -rotate-90">
                              <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-slate-800" />
                              <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="20" fill="transparent" strokeDasharray="502" strokeDashoffset={dashOffset} className="text-blue-500 transition-all duration-1000" />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                              <span className="text-3xl font-extrabold text-white">{utilizedPercent}%</span>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Utilized</span>
                          </div>
                      </div>
                      <div className="mt-6 space-y-2">
                           <div className="flex items-center justify-between text-sm">
                               <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Used Space</span>
                               <span className="font-semibold text-white">{realStats ? realStats.totalUsedU : 0} U</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                               <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-800" /> Available Space</span>
                               <span className="font-semibold text-white">{realStats ? realStats.totalAvailableU - realStats.totalUsedU : 0} U</span>
                           </div>
                      </div>
                 </div>
            </div>
        </div>
    );
}

