'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Clock, XCircle, FileText, Camera } from 'lucide-react';

interface PermitTableProps {
    permits: any[];
    loading: boolean;
    onViewDetail: (permit: any) => void;
}

const PermitTable: React.FC<PermitTableProps> = ({ permits, loading, onViewDetail }) => {
    if (loading) return <div className="p-8 text-center text-slate-400">Loading live data...</div>;

    return (
        <div className="overflow-x-auto">
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
                            <td className="px-6 py-4 font-semibold text-blue-400">
                                {permit.qrCodeToken || `PRM-${permit.id.toString().padStart(3, '0')}`}
                            </td>
                            <td className="px-6 py-4 text-slate-300">{permit.datacenter?.name || 'Unknown'}</td>
                            <td className="px-6 py-4 font-medium text-slate-100">{permit.customer?.name || permit.companyName || 'Unknown'}</td>
                            <td className="px-6 py-4">{permit.visitorNames}</td>
                            <td className="px-6 py-4">{permit.activity}</td>
                            <td className="px-6 py-4">{new Date(permit.scheduledAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                                {permit.status === 'Pending' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3 h-3" /> Pending</span>}
                                {permit.status === 'Approved' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><CheckCircle className="w-3 h-3" /> Approved</span>}
                                {permit.status === 'KioskVerified' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"><Camera className="w-3 h-3" /> Kiosk Verified</span>}
                                {(permit.status === 'Check In' || permit.status === 'CheckIn') && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Users className="w-3 h-3" /> Check In</span>}
                                {permit.status === 'Rejected' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" /> Rejected</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => onViewDetail(permit)} className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors border border-blue-500/30 px-3 py-1.5 rounded-md hover:bg-blue-500/10 inline-flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> View Detail
                                </button>
                            </td>
                        </motion.tr>
                    ))}
                    {permits.length === 0 && (
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No permits found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PermitTable;
