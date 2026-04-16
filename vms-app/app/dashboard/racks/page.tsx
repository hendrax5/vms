'use client';

import { Server, Zap, Search, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function RacksPage() {
    const [racks, setRacks] = useState<any[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: '', rowId: '', uCapacity: 42 });

    useEffect(() => {
        fetchRacks();
        fetchRows();
    }, []);

    const fetchRacks = async () => {
        try {
            const res = await fetch('/api/racks');
            if (res.ok) {
                const data = await res.json();
                setRacks(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRows = async () => {
        try {
            const res = await fetch('/api/rows');
            if (res.ok) {
                const data = await res.json();
                setRows(data);
                if (data.length > 0) setFormData(f => ({ ...f, rowId: data[0].id.toString() }));
                else setFormData(f => ({ ...f, rowId: '' }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddRack = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/racks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({ name: '', rowId: rows[0]?.id.toString() || '', uCapacity: 42 });
                fetchRacks();
            } else {
                alert('Failed to add rack');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteRack = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/racks?id=${deleteTarget}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteTarget(null);
                fetchRacks();
            } else {
                alert('Failed to delete rack');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Rack Inventory & Logistics</h1>
                     <p className="text-muted-foreground mt-1">U-Space allocation monitoring and spatial collision tracking.</p>
                 </div>
                 <div className="flex gap-3">
                     <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">
                         Print Rack Tags
                     </button>
                     <button 
                         onClick={() => setShowModal(true)}
                         className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2"
                     >
                         <Plus className="w-4 h-4" /> Add Rack
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {loading ? (
                     <div className="col-span-full p-8 text-center text-slate-400">Loading live rack data...</div>
                 ) : racks.length === 0 ? (
                     <div className="col-span-full p-8 text-center text-slate-500">No racks configured. Please ensure Datacenters, Rooms, and Rows exist first.</div>
                 ) : (
                     racks.map((rack, i) => {
                         const used = rack.used || 0;
                         const capacity = rack.uCapacity || 42;
                         const usagePercent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
                         const isCritical = usagePercent >= 85;

                         return (
                             <motion.div 
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 transition={{ delay: i * 0.1 }}
                                 key={rack.id} 
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
                                             <button onClick={() => setDeleteTarget(rack.id)} className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                         transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                         className={`h-full rounded-full relative overflow-hidden ${isCritical ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                     >
                                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
                                     </motion.div>
                                 </div>

                                 <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                                     <span className="text-xs text-slate-400">{rack.powerCapacity || 5}kW Power Limit</span>
                                     <a href={`/dashboard/racks/${rack.id}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                         Manage Units &rarr;
                                     </a>
                                 </div>
                             </motion.div>
                         );
                     })
                 )}
            </div>

            {/* Add Rack Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold text-slate-100">Add New Rack</h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddRack} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Row Selection</label>
                                    <select 
                                        required
                                        value={formData.rowId}
                                        onChange={e => setFormData({...formData, rowId: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>Select a row...</option>
                                        {rows.map(r => (
                                            <option key={r.id} value={r.id}>{r.room?.datacenter?.code} - {r.room?.name} - {r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Rack Name / Identifier</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="e.g. RK-A-01"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">U Space Capacity</label>
                                    <input 
                                        required
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={formData.uCapacity}
                                        onChange={e => setFormData({...formData, uCapacity: parseInt(e.target.value)})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                
                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                     <button 
                                         type="submit" 
                                         disabled={saving || rows.length === 0}
                                         className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                                     >
                                         {saving ? 'Creating...' : rows.length === 0 ? 'No Rows Found' : 'Create Rack'}
                                     </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
                        >
                            <div className="flex flex-col items-center text-center space-y-4 mb-6">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-100 mb-2">Confirm Delete</h3>
                                    <p className="text-sm text-slate-400">Are you sure you want to delete this rack? All equipment and connections inside will be permanently cascade deleted!</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 flex-1 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700">
                                    Cancel
                                </button>
                                <button onClick={confirmDeleteRack} className="px-6 py-2 flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
