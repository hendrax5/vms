'use client';

import React from 'react';
import { Server } from 'lucide-react';

interface RackListProps {
    racks: any[];
    onDelete: (id: number) => void;
}

const RackList: React.FC<RackListProps> = ({ racks, onDelete }) => {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                    <tr>
                        <th className="px-6 py-4">Rack ID</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Utilization</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 border-t border-slate-800">
                    {racks.map((rack) => {
                        const used = rack.used || 0;
                        const capacity = rack.uCapacity || 42;
                        const usagePercent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
                        const isCritical = usagePercent >= 85;

                        return (
                            <tr key={rack.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <Server className="w-5 h-5 text-slate-500" />
                                        {rack.name}
                                        {isCritical && <span className="ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Critical</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {rack.roomName || 'N/A'} / {rack.rowName || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden shrink-0">
                                            <div className={`h-full rounded-full ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>{used} / {capacity}U</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <a href={`/dashboard/racks/${rack.id}`} className="text-emerald-400 hover:text-emerald-300 font-medium">Manage</a>
                                    <button onClick={() => onDelete(rack.id)} className="text-red-400/70 hover:text-red-400">Delete</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default RackList;
