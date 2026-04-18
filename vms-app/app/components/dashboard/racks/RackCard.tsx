'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Zap, Trash2 } from 'lucide-react';

interface RackCardProps {
    rack: any;
    index: number;
    onDelete: (id: number) => void;
}

const RackCard: React.FC<RackCardProps> = ({ rack, index, onDelete }) => {
    const used = rack.used || 0;
    const capacity = rack.uCapacity || 42;
    const usagePercent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
    const isCritical = usagePercent >= 85;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl group hover:border-slate-600/50 transition-colors"
        >
            {isCritical && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 py-1 px-2.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Zap className="w-3 h-3" /> CRITICAL
                </div>
            )}
            
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                    <Server className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-100">{rack.name}</h3>
                        <button onClick={() => onDelete(rack.id)} className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">DC: <span className="text-slate-300 font-medium">{rack.siteName || 'N/A'}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Room: <span className="text-slate-300 font-medium">{rack.roomName || 'N/A'}</span> | Row: <span className="text-slate-300">{rack.rowName || 'N/A'}</span></p>
                </div>
            </div>

            <div className="flex items-end justify-between mb-2">
                <div>
                    <p className="text-3xl font-black text-slate-100">{used}<span className="text-base font-medium text-slate-500"> / {capacity}U</span></p>
                </div>
                <p className={`text-sm font-bold ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {usagePercent}% Used
                </p>
            </div>
            
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-6">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 1, delay: 0.2 + (index * 0.1) }}
                    className={`h-full rounded-full relative overflow-hidden ${isCritical ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
                </motion.div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                <span className="text-xs text-slate-400">{rack.powerCapacity || 5}kW Limit</span>
                <a href={`/dashboard/racks/${rack.id}`} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                    Manage Units &rarr;
                </a>
            </div>
        </motion.div>
    );
};

export default RackCard;
