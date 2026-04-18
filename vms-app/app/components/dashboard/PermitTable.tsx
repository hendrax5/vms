'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Clock, XCircle, FileText, Camera, Building2 } from 'lucide-react';

interface PermitTableProps {
    permits: any[];
    loading: boolean;
    onViewDetail: (permit: any) => void;
}

const PermitTable: React.FC<PermitTableProps> = ({ permits, loading, onViewDetail }) => {
    if (loading) return <div className="p-8 text-center text-slate-400">Loading live data...</div>;

    return (
        <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 font-medium">Permit ID</th>
                            <th className="px-6 py-4 font-medium">Datacenter</th>
                            <th className="px-6 py-4 font-medium">Customer/Company</th>
                            <th className="px-6 py-4 font-medium">Visitors</th>
                            <th className="px-6 py-4 font-medium">Activity</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permits.map((permit, idx) => (
                            <motion.tr 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={permit.id} 
                                className="border-b border-border/50 hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="px-6 py-4 font-semibold text-emerald-400">
                                    {permit.qrCodeToken || `PRM-${permit.id.toString().padStart(3, '0')}`}
                                </td>
                                <td className="px-6 py-4 text-slate-300">{permit.datacenter?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 font-medium text-slate-100">{permit.customer?.name || permit.companyName || 'Unknown'}</td>
                                <td className="px-6 py-4">{permit.visitorNames}</td>
                                <td className="px-6 py-4">{permit.activity}</td>
                                <td className="px-6 py-4">{new Date(permit.scheduledAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={permit.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onViewDetail(permit)} className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors border border-emerald-500/30 px-3 py-1.5 rounded-md hover:bg-emerald-500/10 inline-flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> View Detail
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden p-4 space-y-4">
                {permits.map((permit, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={permit.id}
                        onClick={() => onViewDetail(permit)}
                        className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-400 font-mono text-sm font-bold">
                                    {permit.qrCodeToken || `PRM-${permit.id.toString().padStart(3, '0')}`}
                                </p>
                                <h3 className="text-slate-100 font-bold mt-1 text-lg leading-tight">
                                    {permit.customer?.name || permit.companyName || 'Unknown Entity'}
                                </h3>
                            </div>
                            <StatusBadge status={permit.status} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                                <p className="text-slate-500 uppercase tracking-tighter font-bold">Datacenter</p>
                                <p className="text-slate-300 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                    {permit.datacenter?.name || 'Unknown'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-500 uppercase tracking-tighter font-bold">Date</p>
                                <p className="text-slate-300 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    {new Date(permit.scheduledAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <p className="text-slate-500 uppercase tracking-tighter font-bold">Visitors</p>
                                <p className="text-slate-200 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-slate-500" />
                                    {permit.visitorNames}
                                </p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                            <p className="text-xs text-slate-400 italic truncate max-w-[70%]">"{permit.activity}"</p>
                            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                                Details <FileText className="w-3 h-3" />
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {permits.length === 0 && (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 opacity-20" />
                    No visit permits found in this view.
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'Pending') return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3 h-3" /> Pending</span>;
    if (status === 'Approved') return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Approved</span>;
    if (status === 'KioskVerified') return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"><Camera className="w-3 h-3" /> Kiosk Verified</span>;
    if (status === 'Check In' || status === 'CheckIn') return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Users className="w-3 h-3" /> Check In</span>;
    if (status === 'Rejected') return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
};

export default PermitTable;
