'use client';

import { useState, useEffect } from 'react';
import { Scan, UserCheck, Package, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KioskActivityFeed() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = () => {
            fetch('/api/audit-logs?limit=10&action=KIOSK_CHECKIN,GOODS_SCAN')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setLogs(data.logs);
                    }
                    setLoading(false);
                })
                .catch(err => console.error('Kiosk Feed Error:', err));
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-slate-900/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8 backdrop-blur-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Scan className="w-5 h-5 text-emerald-400" />
                        Live Kiosk Activity
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time verification events from the datacenter lobby.</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <Clock className="w-8 h-8 text-slate-500 animate-spin mb-2" />
                        <p className="text-xs text-slate-400">Syncing with kiosk...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50 border-2 border-dashed border-white/5 rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 font-medium">No activity recorded today.</p>
                        <p className="text-[10px] text-slate-600 mt-1">All kiosk scans will appear here instantly.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {logs.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-xl ${log.action === 'KIOSK_CHECKIN' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {log.action === 'KIOSK_CHECKIN' ? <UserCheck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                                                {log.action === 'KIOSK_CHECKIN' ? 'Visitor Entry' : 'Logistics Scan'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-100 font-medium leading-relaxed truncate">
                                            {log.resource}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">Showing latest 10 events</span>
                <button className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest">
                    View Full Audit History
                </button>
            </div>
        </div>
    );
}
