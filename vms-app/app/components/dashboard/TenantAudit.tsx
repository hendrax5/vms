'use client';

import { useState } from 'react';
import { History, UserCheck, Package, Download, Search, Calendar, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface TenantAuditProps {
    permits: any[];
    goods: any[];
}

export default function TenantAudit({ permits, goods }: TenantAuditProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'VISITS' | 'LOGISTICS'>('ALL');

    // Combine and sort checked-in events
    const visitEvents = permits
        .filter(p => p.status === 'CheckIn')
        .map(p => {
            // Try to extract Rack name from activity string like "[Target Rack: RACK-01]"
            const rackMatch = p.activity.match(/\[Target Rack:\s*([^\]]+)\]/);
            return {
                id: p.qrCodeToken || `PRM-${p.id}`,
                type: 'VISIT',
                date: p.checkInAt || p.scheduledAt,
                entity: p.visitorNames,
                activity: p.activity,
                targetRack: rackMatch ? rackMatch[1] : 'N/A',
                location: p.datacenter?.name || 'Main DC'
            };
        });

    const goodsEvents = goods
        .filter(g => g.status === 'CheckedIn')
        .map(g => ({
            id: g.qrCode || `GDS-${g.id}`,
            type: 'LOGISTICS',
            date: g.scannedAt || g.createdAt,
            entity: g.name,
            activity: `Logistics Inbound: ${g.description || 'Verified at kiosk'}`,
            targetRack: 'N/A',
            location: g.datacenter?.name || 'Main DC'
        }));

    const allEvents = [...visitEvents, ...goodsEvents].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const filteredEvents = allEvents.filter(event => {
        const matchesSearch = 
            event.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.targetRack.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = 
            filterType === 'ALL' || 
            (filterType === 'VISITS' && event.type === 'VISIT') ||
            (filterType === 'LOGISTICS' && event.type === 'LOGISTICS');

        return matchesSearch && matchesType;
    });

    const handleDownloadReport = () => {
        const headers = ['Date', 'ID', 'Type', 'Entity/Visitor', 'Target Rack', 'Activity', 'Location'];
        const rows = filteredEvents.map(e => [
            new Date(e.date).toLocaleString(),
            e.id,
            e.type,
            e.entity,
            e.targetRack,
            e.activity.replace(/,/g, ';'), // avoid CSV issues
            e.location
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `VMS_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header section with Stats & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-white/10 p-8 rounded-3xl backdrop-blur-2xl">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-emerald-500" />
                        FACILITY ACCESS AUDIT LOG
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Review all verified visitor entries and logistics movements for your infrastructure.</p>
                </div>
                <button 
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Download className="w-4 h-4" />
                    Export Monthly Report
                </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search by visitor name, rack ID, or activity..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                    />
                </div>
                <div className="flex bg-slate-900/60 border border-white/10 rounded-2xl p-1">
                    {(['ALL', 'VISITS', 'LOGISTICS'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${filterType === type ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Audit Table */}
            <div className="bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity / ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Rack</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Activity Detail</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-30">
                                            <Calendar className="w-12 h-12 mb-4" />
                                            <p className="text-sm font-medium">No audit records found for this criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEvents.map((event, idx) => (
                                    <motion.tr 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={event.id} 
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-mono text-slate-400">
                                                {new Date(event.date).toLocaleDateString()}<br/>
                                                <span className="text-slate-600">{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-200">{event.entity}</span>
                                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter mt-1">{event.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight ${event.type === 'VISIT' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {event.type === 'VISIT' ? <UserCheck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                {event.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`text-xs font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 ${event.targetRack !== 'N/A' ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-500 border-slate-700'}`}>
                                                {event.targetRack}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs text-slate-400 leading-relaxed max-w-md line-clamp-2" title={event.activity}>
                                                {event.activity}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-medium text-slate-300">{event.location}</p>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
