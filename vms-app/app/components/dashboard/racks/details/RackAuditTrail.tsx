'use client';

import React from 'react';
import { History, ArrowRightLeft } from 'lucide-react';

interface RackAuditTrailProps {
    auditLogs: any[];
}

const RackAuditTrail: React.FC<RackAuditTrailProps> = ({ auditLogs }) => {
    return (
        <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <History className="w-5 h-5 text-purple-500" />
                Audit Trail
            </h2>
            
            <div className="space-y-4">
                {auditLogs.length === 0 ? (
                    <p className="text-slate-500 text-xs uppercase font-bold text-center py-4">Pristine State: No movements recorded</p>
                ) : (
                    auditLogs.map((log: any) => (
                        <div key={log.id} className="flex gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-2xl hover:bg-slate-950 transition-colors">
                            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl h-fit">
                                <ArrowRightLeft className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-bold text-slate-200 uppercase">{log.equipment?.name}</h4>
                                    <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{log.user?.name} relocated hardware</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RackAuditTrail;
