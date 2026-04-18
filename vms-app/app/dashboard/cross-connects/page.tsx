'use client';

import { Network, Search, ArrowRightLeft, ShieldAlert, Plus, X, Trash2, CheckCircle, Clock, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function CrossConnectsPage() {
    const [crossConnects, setCrossConnects] = useState<any[]>([]);
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [racks, setRacks] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Complex state for Port selection
    // We select Rack -> Equipment -> Port
    const [formData, setFormData] = useState({
        id: undefined as number | undefined,
        datacenterId: '',
        customerId: '',
        mediaType: 'Singlemode Fiber',
        sideARackId: '',
        sideAEquipmentId: '',
        sideAPortId: '',
        sideZRackId: '',
        sideZEquipmentId: '',
        sideZPortId: ''
    });

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCrossConnects();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        fetchDatacenters();
        fetchRacks();
        fetchCustomers();
    }, []);

    const fetchCrossConnects = async () => {
        setLoading(true);
        try {
            const url = searchQuery 
                ? `/api/cross-connects?search=${encodeURIComponent(searchQuery)}` 
                : '/api/cross-connects';
            const res = await fetch(url);
            const data = await res.json();
            setCrossConnects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDatacenters = async () => {
        try {
            const res = await fetch('/api/datacenters');
            const data = await res.json();
            setDatacenters(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRacks = async () => {
        try {
            const res = await fetch('/api/racks');
            const data = await res.json();
            setRacks(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                datacenterId: parseInt(formData.datacenterId),
                customerId: formData.customerId ? parseInt(formData.customerId) : null,
                mediaType: formData.mediaType,
                sideAPortId: parseInt(formData.sideAPortId),
                sideZPortId: parseInt(formData.sideZPortId),
            };

            const isEdit = !!formData.id;
            if (isEdit) {
                payload.id = formData.id;
                payload.action = 'full_update';
            }

            const res = await fetch('/api/cross-connects', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ 
                    id: undefined, datacenterId: '', customerId: '', mediaType: 'Singlemode Fiber', 
                    sideARackId: '', sideAEquipmentId: '', sideAPortId: '', 
                    sideZRackId: '', sideZEquipmentId: '', sideZPortId: '' 
                });
                fetchCrossConnects();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Failed to process cross-connect', error);
        }
    };

    const handleEditClick = (cx: any) => {
        const sideARackId = cx.sideAPort?.equipment?.rackId?.toString() || '';
        const sideAEquipmentId = cx.sideAPort?.equipmentId?.toString() || '';
        const sideZRackId = cx.sideZPort?.equipment?.rackId?.toString() || '';
        const sideZEquipmentId = cx.sideZPort?.equipmentId?.toString() || '';

        setFormData({
            id: cx.id,
            datacenterId: cx.datacenterId?.toString() || '',
            customerId: cx.customerId?.toString() || '',
            mediaType: cx.mediaType || 'Singlemode Fiber',
            sideARackId,
            sideAEquipmentId,
            sideAPortId: cx.sideAPortId?.toString() || '',
            sideZRackId,
            sideZEquipmentId,
            sideZPortId: cx.sideZPortId?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this cross-connect?')) return;
        try {
            await fetch(`/api/cross-connects?id=${id}`, {
                method: 'DELETE',
            });
            fetchCrossConnects();
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await fetch('/api/cross-connects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            fetchCrossConnects();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Cross-Connect Engine</h1>
                     <p className="text-muted-foreground mt-1">End-to-End pathway mapping with deep port validation.</p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={fetchCrossConnects} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">
                         Refresh List
                     </button>
                     <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] transition-all">
                         <Plus className="w-4 h-4" />
                         Order Cross-Connect
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="col-span-1 md:col-span-2 bg-card/50 border border-border/50 rounded-2xl backdrop-blur-xl overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-semibold text-slate-100">Live Connections</h3>
                        <div className="relative w-64">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                             <input 
                                 type="text" 
                                 placeholder="Search CX, EWO, APJII, Label..." 
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-100 rounded-lg pl-10 pr-4 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                             />
                         </div>
                    </div>
                    <div className="p-0">
                        {loading ? (
                             <div className="p-8 text-center text-slate-400">Loading cross-connects...</div>
                        ) : crossConnects.length === 0 ? (
                             <div className="p-8 text-center text-slate-500">No cross-connects found.</div>
                        ) : (
                            crossConnects.map((cx, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={cx.id} 
                                    className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-slate-800/30 transition-colors gap-4"
                                >
                                    <div className="flex items-center gap-4 w-full sm:w-1/4">
                                         <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                             <Network className="w-5 h-5" />
                                         </div>
                                         <div>
                                             <p className="text-sm font-bold text-slate-200">CX-{cx.id.toString().padStart(4, '0')}</p>
                                             <p className="text-xs text-muted-foreground">{cx.mediaType}</p>
                                             {cx.customer && <p className="text-[10px] text-blue-400 mt-1">{cx.customer.name}</p>}
                                         </div>
                                    </div>
                                    
                                    <div className="flex-1 flex items-center justify-center gap-6">
                                         <div className="text-right">
                                             <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{cx.sideAPort?.equipment?.rack?.name || 'Rack'} : {cx.sideAPort?.equipment?.name || 'Eq'}</p>
                                             <p className="text-sm font-mono text-slate-200 bg-slate-950 px-3 py-1 rounded border border-slate-800">{cx.sideAPort?.portName || 'Unknown Port'}</p>
                                         </div>
                                         <div className="flex flex-col items-center">
                                             <ArrowRightLeft className="w-5 h-5 text-slate-600 mb-1" />
                                         </div>
                                         <div className="text-left">
                                             <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{cx.sideZPort?.equipment?.rack?.name || 'Rack'} : {cx.sideZPort?.equipment?.name || 'Eq'}</p>
                                             <p className="text-sm font-mono text-slate-200 bg-slate-950 px-3 py-1 rounded border border-slate-800">{cx.sideZPort?.portName || 'Unknown Port'}</p>
                                         </div>
                                    </div>

                                    <div className="w-full sm:w-1/4 flex justify-end items-center gap-4">
                                         {cx.status === 'Active' && (
                                             <span className="py-1 px-3 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 object-right">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                             </span>
                                         )}
                                         {cx.status === 'Requested' && (
                                              <span className="py-1 px-3 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
                                                 <Clock className="w-3 h-3" /> Requested
                                              </span>
                                         )}
                                         
                                         <div className="flex gap-2 ml-4">
                                             {cx.status === 'Requested' && (
                                                <button onClick={() => handleUpdateStatus(cx.id, 'Active')} className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors" title="Activate">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                             )}
                                             <button onClick={() => handleEditClick(cx)} className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors" title="Edit">
                                                 <Pencil className="w-4 h-4" />
                                             </button>
                                             <button onClick={() => handleDelete(cx.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                         </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-span-1 bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                        <ShieldAlert className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mb-2">Anti-Collision Engine Active</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        The VMS infrastructure automatically blocks duplicate logical port mappings before they are provisioned to the NOC team, ensuring 100% data integrity inside your physical environment.
                    </p>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-slate-400">Collisions Prevented (30d)</span>
                             <span className="text-sm font-bold text-emerald-400">142</span>
                        </div>
                        <div className="flex justify-between items-center">
                             <span className="text-xs text-slate-400">Total Valid Ports</span>
                             <span className="text-sm font-bold text-blue-400">10,240</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Cross Connect Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden my-auto"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-xl font-semibold text-slate-100">{formData.id ? 'Edit Cross-Connect' : 'Order New Cross-Connect'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Datacenter</label>
                                        <select 
                                            required
                                            value={formData.datacenterId}
                                            onChange={(e) => setFormData({...formData, datacenterId: e.target.value})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">Select a Datacenter...</option>
                                            {datacenters.map(dc => (
                                                <option key={dc.id} value={dc.id}>{dc.name} ({dc.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Customer (Optional)</label>
                                        <select 
                                            value={formData.customerId}
                                            onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">Internal Cross-Connect</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Media Type</label>
                                        <select 
                                            required
                                            value={formData.mediaType}
                                            onChange={(e) => setFormData({...formData, mediaType: e.target.value})}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="Singlemode Fiber">Singlemode Fiber (SMF)</option>
                                            <option value="Multimode Fiber">Multimode Fiber (MMF)</option>
                                            <option value="UTP Cat6">UTP Cat6</option>
                                            <option value="UTP Cat6a">UTP Cat6a</option>
                                            <option value="Direct Attach Cable">Direct Attach Cable (DAC)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Connection Pathway</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                                        
                                        {/* A Side */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 border border-indigo-500/30">A</div>
                                                <span className="text-sm font-medium text-slate-300">Side A Configuration</span>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Source Rack</label>
                                                <select 
                                                    required
                                                    value={formData.sideARackId}
                                                    onChange={(e) => setFormData({...formData, sideARackId: e.target.value, sideAEquipmentId: '', sideAPortId: ''})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="">Select Rack A</option>
                                                    {racks.map(rack => (
                                                        <option key={rack.id} value={rack.id}>{rack.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Equipment</label>
                                                <select 
                                                    required
                                                    disabled={!formData.sideARackId}
                                                    value={formData.sideAEquipmentId}
                                                    onChange={(e) => setFormData({...formData, sideAEquipmentId: e.target.value, sideAPortId: ''})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                >
                                                    <option value="">Select Equipment...</option>
                                                    {formData.sideARackId && racks.find(r => r.id === parseInt(formData.sideARackId))?.equipments?.map((eq: any) => (
                                                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipmentType})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Port</label>
                                                <select 
                                                    required
                                                    disabled={!formData.sideAEquipmentId}
                                                    value={formData.sideAPortId}
                                                    onChange={(e) => setFormData({...formData, sideAPortId: e.target.value})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                >
                                                    <option value="">Select Port...</option>
                                                    {formData.sideAEquipmentId && racks.find(r => r.id === parseInt(formData.sideARackId))?.equipments?.find((e: any) => e.id === parseInt(formData.sideAEquipmentId))?.ports?.map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.portName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                                            <div className="p-2 bg-slate-900 rounded-full border border-slate-700 text-slate-500 z-10 shadow-lg">
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </div>
                                            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-48 border-t border-slate-800 border-dashed" />
                                        </div>

                                        {/* Z Side */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-300 border border-emerald-500/30">Z</div>
                                                <span className="text-sm font-medium text-slate-300">Side Z Configuration</span>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Destination Rack</label>
                                                <select 
                                                    required
                                                    value={formData.sideZRackId}
                                                    onChange={(e) => setFormData({...formData, sideZRackId: e.target.value, sideZEquipmentId: '', sideZPortId: ''})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="">Select Rack Z</option>
                                                    {racks.map(rack => (
                                                        <option key={rack.id} value={rack.id}>{rack.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Equipment</label>
                                                <select 
                                                    required
                                                    disabled={!formData.sideZRackId}
                                                    value={formData.sideZEquipmentId}
                                                    onChange={(e) => setFormData({...formData, sideZEquipmentId: e.target.value, sideZPortId: ''})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                >
                                                    <option value="">Select Equipment...</option>
                                                    {formData.sideZRackId && racks.find(r => r.id === parseInt(formData.sideZRackId))?.equipments?.map((eq: any) => (
                                                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipmentType})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Port</label>
                                                <select 
                                                    required
                                                    disabled={!formData.sideZEquipmentId}
                                                    value={formData.sideZPortId}
                                                    onChange={(e) => setFormData({...formData, sideZPortId: e.target.value})}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                >
                                                    <option value="">Select Port...</option>
                                                    {formData.sideZEquipmentId && racks.find(r => r.id === parseInt(formData.sideZRackId))?.equipments?.find((e: any) => e.id === parseInt(formData.sideZEquipmentId))?.ports?.map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.portName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        {formData.id ? 'Save Changes' : 'Submit Request'}
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
