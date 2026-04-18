'use client';

import { useState, useEffect } from 'react';
import { Network, Activity, Clock, ShieldCheck, X, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantInterconnection({ 
    crossConnects, 
    datacenters, 
    equipments, 
    customerId, 
    onRefresh 
}: { 
    crossConnects: any[], 
    datacenters?: any[], 
    equipments?: any[], 
    customerId?: string | number | null, 
    onRefresh?: () => void 
}) {
    const [selectedAudit, setSelectedAudit] = useState<any>(null);

    // Derive unique racks the customer has access to (for both Side A and Side Z)
    const availableRacks = [...new Map((equipments || []).map((eq: any) => [eq.rackId, eq.rack])).values()].filter(Boolean);

    return (
        <div className="space-y-6 flex relative">
            <div className={`transition-all duration-300 w-full ${selectedAudit ? 'lg:w-2/3 pr-6' : 'w-full'}`}>
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-sm shadow-sm mb-6">
                    <div>
                        <h3 className="font-bold text-slate-200 uppercase tracking-wide">Interconnection Services</h3>
                        <p className="text-xs text-slate-500 mt-1">Cross connect directory and operational audit logs.</p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/dashboard/cross-connects'}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-lg shadow-red-900/20"
                    >
                        Order Cross-Connect
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                    <table className="w-full text-sm text-left text-slate-300">
                         <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
                             <tr>
                                 <th className="px-5 py-4">Assets</th>
                                 <th className="px-5 py-4">Status</th>
                                 <th className="px-5 py-4">Connections (A → Z)</th>
                                 <th className="px-5 py-4 text-right">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                             {crossConnects.length === 0 && (
                                 <tr>
                                     <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                                         <Network className="w-8 h-8 mx-auto mb-3 opacity-50"/>
                                         No active interconnections found.
                                     </td>
                                 </tr>
                             )}
                             {crossConnects.map((cc: any) => (
                                 <tr key={cc.id} className="hover:bg-slate-800/30 transition-colors">
                                     <td className="px-5 py-4">
                                         <span className="font-bold text-slate-200">CC-X-{cc.id.toString().padStart(4, '0')}</span><br/>
                                         <span className="text-xs font-mono text-slate-500">{cc.mediaType}</span>
                                     </td>
                                     <td className="px-5 py-4">
                                        <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wide font-bold border ${cc.status === 'Active' ? 'bg-emerald-950 border-emerald-800 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                            {cc.status}
                                        </span>
                                     </td>
                                     <td className="px-5 py-4 text-xs font-mono">
                                         <div className="flex flex-col gap-1">
                                             <div className="bg-slate-950 px-2 py-1 border border-slate-800 flex justify-between space-x-2">
                                                 <span className="text-slate-500">A</span><span className="text-emerald-400">{cc.sideAPort?.equipment?.name} {cc.sideAPort?.portName}</span>
                                             </div>
                                             <div className="bg-slate-950 px-2 py-1 border border-slate-800 flex justify-between space-x-2">
                                                 <span className="text-slate-500">Z</span><span className="text-purple-400">{cc.sideZPort?.equipment?.name} {cc.sideZPort?.portName}</span>
                                             </div>
                                         </div>
                                     </td>
                                     <td className="px-5 py-4 text-right">
                                          <button 
                                            onClick={() => setSelectedAudit(cc)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors uppercase"
                                         >
                                             Audit Trail
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                    </table>
                </div>
            </div>

            {/* Slide-out Audit Panel */}
            <AnimatePresence>
                {selectedAudit && (
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 50 }} 
                        className="fixed lg:relative inset-y-0 right-0 z-40 w-full md:w-96 lg:w-1/3 bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto lg:h-auto lg:shadow-none"
                    >
                         <div className="top-0 sticky bg-slate-950 z-10 p-5 border-b border-slate-800 flex justify-between items-center">
                             <h4 className="font-bold text-slate-100 uppercase tracking-widest text-sm flex items-center gap-2">
                                 <FileText className="w-4 h-4 text-red-500" />
                                 Audit Details
                             </h4>
                             <button onClick={() => setSelectedAudit(null)}><X className="text-slate-500 hover:text-white" /></button>
                         </div>
                         <div className="p-6 space-y-8">
                             <div>
                                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service ID</p>
                                 <p className="font-mono text-slate-200 bg-slate-900 border border-slate-800 px-3 py-2">
                                     CC-X-{selectedAudit.id.toString().padStart(4, '0')}
                                 </p>
                             </div>

                             <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-800">
                                  
                                  {/* Event 1: Creation */}
                                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-950 bg-slate-500 group-[.is-active]:bg-red-500 ml-3 md:mx-auto shrink-0 z-10 shadow"></div>
                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-sm border border-slate-800 bg-slate-900 shadow-sm ml-2 md:mr-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-300 text-xs uppercase">Service Ordered</span>
                                            <span className="font-mono text-[10px] text-slate-500 mt-1">{new Date(selectedAudit.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                  </div>

                                  {/* Event 2: Last Action */}
                                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-950 bg-slate-500 group-[.is-active]:bg-emerald-500 ml-3 md:mx-auto shrink-0 z-10 shadow"></div>
                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-sm border border-slate-800 bg-slate-900 shadow-sm ml-2 md:mr-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-300 text-xs uppercase">Status: {selectedAudit.status}</span>
                                            <span className="font-mono text-[10px] text-slate-500 mt-1">{new Date(selectedAudit.updatedAt).toLocaleString()}</span>
                                            <span className="text-xs text-slate-400 mt-2">Physical patch recorded against asset logs.</span>
                                        </div>
                                    </div>
                                  </div>

                             </div>

                             <div className="pt-8 border-t border-slate-800">
                                 <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors">
                                     <Download className="w-4 h-4"/> Download LOA-CFA
                                 </button>
                             </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
