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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [providers, setProviders] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        datacenterId: '',
        sideARackId: '',
        sideAEquipmentId: '',
        sideAPortId: '',
        targetType: '',
        targetProvider: '',
        targetNotes: '',
        sideZRackId: '',
        sideZEquipmentId: '',
        sideZPortId: '',
        mediaType: 'Singlemode Fiber'
    });

    // Derive unique racks the customer has access to (for both Side A and Side Z)
    const availableRacks = [...new Map((equipments || []).map((eq: any) => [eq.rackId, eq.rack])).values()].filter(Boolean);

    // Fetch Providers when Datacenter is selected
    useEffect(() => {
        if (formData.datacenterId && isModalOpen) {
            fetch(`/api/providers?datacenterId=${formData.datacenterId}`)
                .then(r => r.json())
                .then(data => setProviders(data || []))
                .catch(e => console.error(e));
        }
    }, [formData.datacenterId, isModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            // Reconstruct destination text for backwards compatibility or NOC info
            let destinationStr = formData.targetType;
            if (formData.targetType === 'Internal') {
                destinationStr = 'Internal Cross-Connect';
            } else if (formData.targetType === 'Custom') {
                destinationStr = formData.targetNotes;
            } else {
                destinationStr = `${formData.targetType}: ${formData.targetProvider}`;
            }

            const res = await fetch('/api/cross-connects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData, 
                    customerId,
                    destination: destinationStr
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to request cross connect');
            }
            if (onRefresh) onRefresh();
            setIsModalOpen(false);
            setFormData({
                datacenterId: '',
                sideARackId: '',
                sideAEquipmentId: '',
                sideAPortId: '',
                targetType: '',
                targetProvider: '',
                targetNotes: '',
                sideZRackId: '',
                sideZEquipmentId: '',
                sideZPortId: '',
                mediaType: 'Singlemode Fiber'
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 flex relative">
            <div className={`transition-all duration-300 w-full ${selectedAudit ? 'lg:w-2/3 pr-6' : 'w-full'}`}>
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-sm shadow-sm mb-6">
                    <div>
                        <h3 className="font-bold text-slate-200 uppercase tracking-wide">Interconnection Services</h3>
                        <p className="text-xs text-slate-500 mt-1">Cross connect directory and operational audit logs.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-lg shadow-red-900/20"
                    >
                        Order Interconnection
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
                                                 <span className="text-slate-500">A</span><span className="text-blue-400">{cc.sideAPort?.equipment?.name} {cc.sideAPort?.portName}</span>
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
            {/* Order Cross Connect Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-widest text-shadow-sm">Order Interconnection</h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {error && (
                                    <div className="bg-red-950/50 border-l-2 border-red-500 p-3 text-red-200 text-sm font-mono break-words">
                                        {error}
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Datacenter / Facility</label>
                                    <select 
                                        required
                                        value={formData.datacenterId}
                                        onChange={(e) => setFormData({...formData, datacenterId: e.target.value, sideARackId: '', sideAEquipmentId: '', sideAPortId: ''})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                                    >
                                        <option value="">Select Facility...</option>
                                        {(datacenters || []).map((dc: any) => (
                                            <option key={dc.id} value={dc.id}>{dc.name} ({dc.status})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cabinet ID</label>
                                        <select 
                                            required
                                            disabled={!formData.datacenterId}
                                            value={formData.sideARackId}
                                            onChange={(e) => setFormData({...formData, sideARackId: e.target.value, sideAEquipmentId: '', sideAPortId: ''})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                        >
                                            <option value="">Select Cabinet...</option>
                                            {availableRacks.filter(r => r.row?.roomId === parseInt(formData.datacenterId) || !formData.datacenterId /* fallback */).map((r: any) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Patch Panel (A)</label>
                                        <select 
                                            required
                                            disabled={!formData.sideARackId}
                                            value={formData.sideAEquipmentId}
                                            onChange={(e) => setFormData({...formData, sideAEquipmentId: e.target.value, sideAPortId: ''})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                        >
                                            <option value="">Select Panel...</option>
                                            {/* Crucial logic: Only PATCH_PANELs accessible in that rack */}
                                            {(equipments || []).filter(eq => eq.rackId === parseInt(formData.sideARackId) && eq.equipmentType === 'PATCH_PANEL').map((eq: any) => (
                                                <option key={eq.id} value={eq.id}>{eq.name} ({eq.customerId ? 'Dedicated' : 'Shared'})</option>
                                            ))}
                                        </select>
                                     </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Port (A)</label>
                                        <select 
                                            required
                                            disabled={!formData.sideAEquipmentId}
                                            value={formData.sideAPortId}
                                            onChange={(e) => setFormData({...formData, sideAPortId: e.target.value})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                        >
                                            <option value="">Select Port...</option>
                                            {(equipments || []).find((eq: any) => eq.id === parseInt(formData.sideAEquipmentId))?.ports?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.portName}</option>
                                            ))}
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Connection Type (Z)</label>
                                        <select 
                                            required
                                            value={formData.targetType}
                                            onChange={(e) => setFormData({...formData, targetType: e.target.value, targetProvider: '', targetNotes: ''})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Select Target Type...</option>
                                            <option value="Internal">Internal Cross-Connect (My Racks)</option>
                                            <option value="IXP">Public Peering / IXP</option>
                                            <option value="Carrier">Carrier / ISP</option>
                                            <option value="Cloud">Cloud On-Ramp</option>
                                            <option value="Custom">Other Entity / Manual</option>
                                        </select>
                                     </div>
                                </div>

                                {formData.targetType && formData.targetType !== 'Internal' && formData.targetType !== 'Custom' && (
                                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Provider</label>
                                            <select 
                                                required
                                                value={formData.targetProvider}
                                                onChange={(e) => setFormData({...formData, targetProvider: e.target.value})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select Provider...</option>
                                                {providers.filter(p => p.type === formData.targetType).map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                                <option value="Other">Other (Not Listed)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                                {formData.targetType === 'IXP' ? 'Member ASN' : 'Circuit ID / Account'}
                                            </label>
                                            <input 
                                                type="text"
                                                required
                                                value={formData.targetNotes}
                                                onChange={(e) => setFormData({...formData, targetNotes: e.target.value})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                                placeholder={formData.targetType === 'IXP' ? "e.g. AS12345" : "e.g. CKT-9876543"}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.targetProvider === 'Other' || formData.targetType === 'Custom' ? (
                                    <div className="border-t border-slate-800 pt-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Detailed Target Note</label>
                                        <input 
                                            type="text"
                                            required
                                            value={formData.targetNotes}
                                            onChange={(e) => setFormData({...formData, targetNotes: e.target.value})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                                            placeholder="Write detailed destination (e.g., Company X rack 4)"
                                        />
                                    </div>
                                ) : null}

                                {formData.targetType === 'Internal' && (
                                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Cabinet</label>
                                            <select 
                                                required
                                                value={formData.sideZRackId}
                                                onChange={(e) => setFormData({...formData, sideZRackId: e.target.value, sideZEquipmentId: '', sideZPortId: ''})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Select Cabinet...</option>
                                                {availableRacks.filter(r => r.row?.roomId === parseInt(formData.datacenterId) || !formData.datacenterId).map((r: any) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                         </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Equipment</label>
                                            <select 
                                                required
                                                disabled={!formData.sideZRackId}
                                                value={formData.sideZEquipmentId}
                                                onChange={(e) => setFormData({...formData, sideZEquipmentId: e.target.value, sideZPortId: ''})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                            >
                                                <option value="">Select Target...</option>
                                                {(equipments || []).filter(eq => eq.rackId === parseInt(formData.sideZRackId)).map((eq: any) => (
                                                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                                                ))}
                                            </select>
                                         </div>
                                         <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Target Port</label>
                                            <select 
                                                required
                                                disabled={!formData.sideZEquipmentId}
                                                value={formData.sideZPortId}
                                                onChange={(e) => setFormData({...formData, sideZPortId: e.target.value})}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                            >
                                                <option value="">Select Port...</option>
                                                {(equipments || []).find((eq: any) => eq.id === parseInt(formData.sideZEquipmentId))?.ports?.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.portName}</option>
                                                ))}
                                            </select>
                                         </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white uppercase transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-sm font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-50 flex items-center shadow-lg shadow-red-900/20"
                                    >
                                        {isSubmitting ? 'Processing...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
