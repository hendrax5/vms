'use client';

import { Server, Zap, Search, Plus, Trash2, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function RacksPage() {
    const [racks, setRacks] = useState<any[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: '', rowId: '', uCapacity: 42 });

    // Pagination, Filter, & View Mode States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const uniqueLocations = Array.from(new Set(racks.map(r => r.siteName).filter(Boolean))) as string[];

    useEffect(() => {
        // Load view preference
        const savedView = localStorage.getItem('rackViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }

        fetchRacks();
        fetchRows();
    }, []);

    const toggleViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('rackViewMode', mode);
    };

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
                toast.success('Rack provisioned successfully');
            } else {
                toast.error('Failed to add rack');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred.');
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
                toast.success('Rack decommissioned successfully');
            } else {
                toast.error('Failed to delete rack');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Filter Logic
    const filteredRacks = racks.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              r.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              r.rowName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = selectedLocation === 'All Locations' || r.siteName === selectedLocation;
        return matchesSearch && matchesLocation;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredRacks.length / itemsPerPage) || 1;
    const paginatedRacks = filteredRacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when searching or filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedLocation]);

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Rack Inventory & Logistics</h1>
                     <p className="text-muted-foreground mt-1">U-Space allocation monitoring and spatial collision tracking.</p>
                 </div>
                 <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                     <div className="relative">
                         <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                         <input 
                            type="text" 
                            placeholder="Search racks..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 min-w-[200px]"
                         />
                     </div>
                     <select 
                         value={selectedLocation} 
                         onChange={(e) => setSelectedLocation(e.target.value)} 
                         className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 max-w-[200px] truncate cursor-pointer"
                     >
                         <option value="All Locations">All Locations</option>
                         {uniqueLocations.map(loc => (
                             <option key={loc} value={loc}>{loc}</option>
                         ))}
                     </select>
                     <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                         <button 
                            onClick={() => toggleViewMode('grid')}
                            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                         >
                             <LayoutGrid className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => toggleViewMode('list')}
                            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                         >
                             <List className="w-4 h-4" />
                         </button>
                     </div>
                     <button 
                         onClick={() => setShowModal(true)}
                         className="px-5 py-2.5 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2"
                     >
                         <Plus className="w-4 h-4" /> Add Rack
                     </button>
                 </div>
            </div>

            {/* List / Grid Display */}
            {loading ? (
                <div className="p-8 text-center text-slate-400">Loading live rack data...</div>
            ) : filteredRacks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800/50">No racks match your search criteria.</div>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {paginatedRacks.map((rack, i) => {
                         const used = rack.used || 0;
                         const capacity = rack.uCapacity || 42;
                         const usagePercent = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
                         const isCritical = usagePercent >= 85;

                         return (
                             <motion.div 
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 transition={{ delay: i * 0.05 }}
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
                                         transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                                         className={`h-full rounded-full relative overflow-hidden ${isCritical ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                     >
                                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
                                     </motion.div>
                                 </div>

                                 <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                                     <span className="text-xs text-slate-400">{rack.powerCapacity || 5}kW Limit</span>
                                     <a href={`/dashboard/racks/${rack.id}`} className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                         Manage Units &rarr;
                                     </a>
                                 </div>
                             </motion.div>
                         );
                     })}
                </div>
            ) : (
                /* LIST VIEW */
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
                            {paginatedRacks.map((rack) => {
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
                                            <a href={`/dashboard/racks/${rack.id}`} className="text-blue-400 hover:text-blue-300 font-medium">Manage</a>
                                            <button onClick={() => setDeleteTarget(rack.id)} className="text-red-400/70 hover:text-red-400">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                 <div className="flex items-center justify-between mt-8 border-t border-slate-800/50 pt-6">
                      <p className="text-sm text-slate-400">
                          Showing <span className="text-slate-200 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-200 font-medium">{Math.min(currentPage * itemsPerPage, filteredRacks.length)}</span> of <span className="text-slate-200 font-medium">{filteredRacks.length}</span> racks
                      </p>
                      <div className="flex gap-2">
                          <button 
                             disabled={currentPage === 1}
                             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                             className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm font-medium"
                          >
                              Previous
                          </button>
                          <button 
                             disabled={currentPage === totalPages}
                             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                             className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm font-medium"
                          >
                              Next
                          </button>
                      </div>
                 </div>
            )}

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
                                         {saving ? 'Creating...' : 'Create Rack'}
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
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-rose-500/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center"
                        >
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-100 mb-2">Delete Rack?</h3>
                            <p className="text-sm text-slate-400 mb-6">This action cannot be undone. All equipment mapped to this rack will be permanently deleted via Cascade.</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDeleteRack}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium"
                                >
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
