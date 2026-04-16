'use client';

import { Activity, ShieldCheck, AlertTriangle, CloudRain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function SLAEnginePage() {
    const [slaData, setSlaData] = useState<{incidents: any[], uptime: number, totalDowntime: number}>({ incidents: [], uptime: 100, totalDowntime: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSLA();
    }, []);

    const fetchSLA = async () => {
        try {
            const res = await fetch('/api/sla');
            const data = await res.json();
            setSlaData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">SLA Engine</h1>
                     <p className="text-muted-foreground mt-1">Automated downtime tracking and Vendor Maintenance calculations.</p>
                 </div>
                 <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-all border border-slate-700">
                     Export SLA Report (PDF)
                 </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* SLA Score */}
                 <div className="bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                     <ShieldCheck className="w-12 h-12 text-emerald-400 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                     <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-emerald-600 mb-2">{slaData.uptime.toFixed(3)}%</h2>
                     <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold">MTD Network Uptime</p>
                 </div>

                 {/* Downtime Mins */}
                 <div className="bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                     <Activity className="w-12 h-12 text-amber-400 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                     <h2 className="text-5xl font-extrabold text-slate-100 mb-2">{slaData.totalDowntime}</h2>
                     <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Total Downtime (Mins)</p>
                 </div>

                 {/* Incidents logged */}
                 <div className="bg-card/40 border border-border/50 rounded-2xl p-8 backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                     <AlertTriangle className="w-12 h-12 text-blue-400 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                     <h2 className="text-5xl font-extrabold text-slate-100 mb-2">{slaData.incidents.length}</h2>
                     <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Detected Incidents</p>
                 </div>
            </div>

            <div className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden backdrop-blur-xl mt-8">
                 <div className="p-6 border-b border-border/50">
                      <h3 className="text-lg font-bold text-slate-100">Vendor Maintenance Sub-System</h3>
                 </div>
                 
                 <div className="p-0">
                     {loading ? (
                         <div className="p-8 text-center text-slate-400">Processing SLA history...</div>
                     ) : slaData.incidents.length === 0 ? (
                         <div className="p-8 text-center text-slate-500">Superb! No incidents recorded.</div>
                     ) : (
                         slaData.incidents.map((incident, i) => (
                             <motion.div 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: i * 0.1 }}
                                 key={incident.id} 
                                 className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-b border-border/50 last:border-0 hover:bg-slate-800/20 transition-colors gap-4 md:gap-0"
                             >
                                 <div className="flex items-start gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                          {incident.isDowntimeEvent ? <Activity className="w-5 h-5 text-amber-500" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-3 mb-1">
                                               <h4 className="text-base font-bold text-slate-200">{incident.description}</h4>
                                               <span className="py-0.5 px-2 rounded bg-slate-800 text-xs text-slate-400 border border-slate-700">{incident.vendorName}</span>
                                          </div>
                                          <p className="text-sm text-muted-foreground">{new Date(incident.startTime).toLocaleString()} - {new Date(incident.endTime).toLocaleString()}</p>
                                      </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-8 md:pl-0 pl-16">
                                      <div className="text-right">
                                          <p className="text-xs text-slate-500 mb-1">Calculated Impact</p>
                                          <p className={`text-lg font-bold ${incident.downtimeMins > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{incident.downtimeMins} mins</p>
                                      </div>
                                 </div>
                             </motion.div>
                         ))
                     )}
                 </div>
            </div>
        </div>
    );
}
