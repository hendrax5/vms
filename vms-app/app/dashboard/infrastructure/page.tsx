'use client';

import { useState, useEffect } from 'react';
import { Network, Server, Box, Layers, Building2, MapPin, Plus, X, Trash2, MoreVertical, Edit2 } from 'lucide-react';

const ActionMenu = ({ onEdit, onDelete }: { onEdit: (e:any)=>void, onDelete: (e:any)=>void }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }} 
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400"
            >
                <MoreVertical className="w-5 h-5" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} />
                    <div className="absolute right-0 mt-1 w-32 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-1 overflow-visible">
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit(e); }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(e); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function InfrastructureTopologyPage() {
    const { data: session } = useSession();
    const [topology, setTopology] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{type: string, id: number} | null>(null);
    const [editEntityId, setEditEntityId] = useState<number | null>(null);
    const [addType, setAddType] = useState('datacenter');
    const [formData, setFormData] = useState({ name: '', code: '', regionId: '', datacenterId: '', roomId: '', rowId: '', uCapacity: '42' });

    const loadData = () => {
        setLoading(true);
        fetch('/api/regions')
            .then(r => r.json())
            .then(data => {
                if (!data.error) setRegions(data);
            });

        fetch('/api/topology')
            .then(r => r.json())
            .then(data => {
                if (!data.error) setTopology(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleEditClick = (e: any, type: string, entity: any, parentId?: string) => {
        e.stopPropagation();
        setAddType(type);
        setEditEntityId(entity.id);
        const newData = {
            name: entity.name,
            code: entity.code || '',
            regionId: type === 'datacenter' && parentId ? parentId : '',
            datacenterId: type === 'room' && parentId ? parentId : '',
            roomId: type === 'row' && parentId ? parentId : '',
            rowId: type === 'rack' && parentId ? parentId : '',
            uCapacity: entity.uCapacity ? entity.uCapacity.toString() : '42'
        };
        setFormData(newData);
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = async (e: any) => {
        e.preventDefault();
        let url = '';
        let payload: any = {};
        
        try {
            if (addType === 'region') {
                url = '/api/regions';
                payload = { name: formData.name, code: formData.code || formData.name.toUpperCase() };
            } else if (addType === 'datacenter') {
                url = '/api/datacenters';
                payload = { name: formData.name, code: formData.code, regionId: parseInt(formData.regionId) };
            } else if (addType === 'room') {
                url = '/api/rooms';
                payload = { name: formData.name, datacenterId: parseInt(formData.datacenterId) };
            } else if (addType === 'row') {
                url = '/api/rows';
                payload = { name: formData.name, roomId: parseInt(formData.roomId) };
            } else if (addType === 'rack') {
                url = '/api/racks';
                payload = { name: formData.name, rowId: parseInt(formData.rowId), uCapacity: parseInt(formData.uCapacity) };
            }

            const fetchUrl = editEntityId ? `${url}/${editEntityId}` : url;
            const res = await fetch(fetchUrl, {
                method: editEntityId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setEditEntityId(null);
                setFormData({ name: '', code: '', regionId: '', datacenterId: '', roomId: '', rowId: '', uCapacity: '42' });
                loadData();
            } else {
                alert('Failed to save facility.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        }
    };

    const triggerDelete = (e: React.MouseEvent, type: string, id: number) => {
        e.stopPropagation();
        setDeleteTarget({ type, id });
    };

    const confirmDeleteEntity = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/${deleteTarget.type}s/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteTarget(null);
                loadData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading && topology.length === 0) {
        return <div className="p-8 text-neutral-400 font-mono animate-pulse">Mapping infrastructure telemetry...</div>;
    }

    const userPermissions = (session?.user as any)?.permissions || [];
    const userRoleRaw = (session?.user as any)?.role as string || '';
    const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
    const canEdit = isSuperAdmin || userPermissions.includes('infrastructure:edit');

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                         <Network className="w-8 h-8 text-indigo-500" /> Infrastructure Topology
                     </h1>
                     <p className="text-slate-400 mt-1">Full hierarchical view of regions, datacenters, rooms, rows, and racks.</p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={() => setExpandedNodes({})} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">
                         Collapse All
                     </button>
                     {canEdit && (
                         <button onClick={() => { setEditEntityId(null); setIsAddModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                             <Plus className="w-4 h-4" /> Add Facility
                         </button>
                     )}
                 </div>
            </div>

            {/* Topology Rendering */}
            <div className="grid grid-cols-1 gap-6">
                 {topology.map((dc, i) => (
                      <motion.div 
                          key={dc.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
                      >
                           <div 
                               className="p-5 flex items-center justify-between bg-gradient-to-r from-neutral-900 to-indigo-900/20 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                               onClick={() => toggleNode(`dc-${dc.id}`)}
                           >
                               <div className="flex items-center gap-4">
                                   <div className="p-3 bg-indigo-500/10 rounded-xl">
                                       <Building2 className="w-6 h-6 text-indigo-400" />
                                   </div>
                                   <div>
                                       <h2 className="text-xl font-bold text-white">{dc.name} <span className="text-indigo-400 font-mono text-sm ml-2">[{dc.code}]</span></h2>
                                       <p className="text-sm text-neutral-400 flex items-center gap-1 mt-1">
                                           <MapPin className="w-3 h-3" /> {dc.region?.name || 'Global'}
                                       </p>
                                   </div>
                               </div>
                               <div className="flex gap-4 items-center">
                                   <div className="text-right">
                                       <p className="text-2xl font-black text-white">{dc.rooms?.length || 0}</p>
                                       <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Rooms</p>
                                   </div>
                                   <div className="ml-4">
                                       {canEdit && (
                                           <ActionMenu 
                                               onEdit={(e) => handleEditClick(e, 'datacenter', dc, dc.regionId?.toString())}
                                               onDelete={(e) => triggerDelete(e, 'datacenter', dc.id)} 
                                           />
                                       )}
                                   </div>
                               </div>
                           </div>

                           <AnimatePresence>
                               {(expandedNodes[`dc-${dc.id}`] ?? true) && (
                                   <motion.div 
                                       initial={{ height: 0, opacity: 0 }}
                                       animate={{ height: 'auto', opacity: 1 }}
                                       exit={{ height: 0, opacity: 0 }}
                                       className="border-t border-neutral-800"
                                   >
                                        <div className="p-6 space-y-6 bg-black/20">
                                            {dc.rooms?.map((room: any) => (
                                                <div key={room.id} className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/50">
                                                    <div 
                                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                                        onClick={() => toggleNode(`room-${room.id}`)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Layers className="w-5 h-5 text-blue-400" />
                                                            <h3 className="text-lg font-bold text-neutral-200">Room: {room.name}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full">{room.rows?.length || 0} Rows</span>
                                                            {canEdit && (
                                                                <ActionMenu 
                                                                    onEdit={(e) => handleEditClick(e, 'room', room, dc.id.toString())}
                                                                    onDelete={(e) => triggerDelete(e, 'room', room.id)} 
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {(expandedNodes[`room-${room.id}`]) && (
                                                            <motion.div 
                                                                initial={{ height: 0 }}
                                                                animate={{ height: 'auto' }}
                                                                exit={{ height: 0 }}
                                                                className="overflow-hidden border-t border-neutral-800 bg-neutral-950/50"
                                                            >
                                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                    {room.rows?.map((row: any) => (
                                                                        <div key={row.id} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 shadow-inner">
                                                                            <div className="flex justify-between items-center mb-4">
                                                                                <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                                                                                    <Box className="w-4 h-4 text-emerald-400" /> Row {row.name}
                                                                                </h4>
                                                                                {canEdit && (
                                                                                    <ActionMenu 
                                                                                        onEdit={(e) => handleEditClick(e, 'row', row, room.id.toString())}
                                                                                        onDelete={(e) => triggerDelete(e, 'row', row.id)} 
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                {row.racks?.map((rack: any) => (
                                                                                    <Link href={`/dashboard/racks/${rack.id}`} key={rack.id} className="block group">
                                                                                        <div className="bg-black border border-neutral-800 p-3 rounded-lg flex items-center justify-between group-hover:border-emerald-500/50 transition-colors">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <Server className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                                                                                                <div>
                                                                                                    <p className="text-sm font-bold text-neutral-200">{rack.name}</p>
                                                                                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{rack.equipments?.length || 0} Assets</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right flex items-center gap-3">
                                                                                                <span className="text-xs text-neutral-400 font-mono">{rack.uCapacity}U Capacity</span>
                                                                                                {canEdit && (
                                                                                                    <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                                                                                                        <ActionMenu 
                                                                                                            onEdit={(e) => handleEditClick(e, 'rack', rack, row.id.toString())}
                                                                                                            onDelete={(e) => triggerDelete(e, 'rack', rack.id)} 
                                                                                                        />
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </Link>
                                                                                ))}
                                                                                {row.racks?.length === 0 && (
                                                                                    <p className="text-xs text-neutral-600 text-center py-2">No racks.</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {room.rows?.length === 0 && (
                                                                        <div className="col-span-full py-4 text-center text-sm text-neutral-600">No rows configured.</div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                            {dc.rooms?.length === 0 && (
                                                <div className="text-center py-8 text-neutral-500">No rooms mapped in this datacenter.</div>
                                            )}
                                        </div>
                                   </motion.div>
                               )}
                           </AnimatePresence>
                      </motion.div>
                 ))}
                 
                 {topology.length === 0 && (
                     <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl">
                         <Building2 className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                         <h3 className="text-lg font-medium text-white">No Datacenters Found</h3>
                         <p className="text-neutral-500">Click "Add Facility" to start building your infrastructure map.</p>
                     </div>
                 )}
            </div>

            {/* Add Facility Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{editEntityId ? 'Edit' : 'Add'} Infrastructure</h3>
                                <button onClick={() => { setIsAddModalOpen(false); setEditEntityId(null); }} className="text-neutral-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Entity Type</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                        value={addType}
                                        onChange={(e) => setAddType(e.target.value)}
                                    >
                                        <option value="region">1. Region</option>
                                        <option value="datacenter">2. Datacenter</option>
                                        <option value="room">3. Data Room</option>
                                        <option value="row">4. Row (Lorong)</option>
                                        <option value="rack">5. Rack / Cabinet</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Entity Name</label>
                                    <input 
                                        type="text" required
                                        placeholder="e.g. Jakarta East, JKT-01, Room A"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                {addType === 'datacenter' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Facility Code</label>
                                            <input 
                                                type="text" required placeholder="e.g. JKT-1"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Parent Region</label>
                                            <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})}>
                                                <option value="">Select Region</option>
                                                {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {addType === 'room' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Parent Datacenter</label>
                                        <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            value={formData.datacenterId} onChange={e => setFormData({...formData, datacenterId: e.target.value})}>
                                            <option value="">Select Datacenter</option>
                                            {topology.map(dc => <option key={dc.id} value={dc.id}>{dc.name} [{dc.code}]</option>)}
                                        </select>
                                    </div>
                                )}

                                {addType === 'row' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Parent Room</label>
                                        <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                                            <option value="">Select Room</option>
                                            {topology.flatMap(dc => dc.rooms || []).map((room:any) => 
                                                <option key={room.id} value={room.id}>{room.name} (Site: {room.datacenter?.code || 'N/A'})</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {addType === 'rack' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Parent Row</label>
                                            <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                value={formData.rowId} onChange={e => setFormData({...formData, rowId: e.target.value})}>
                                                <option value="">Select Row</option>
                                                {topology.flatMap(dc => dc.rooms || []).flatMap((r:any) => r.rows || []).map((row:any) => 
                                                    <option key={row.id} value={row.id}>Row {row.name}</option>
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">U Capacity</label>
                                            <input 
                                                type="number" required placeholder="42"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                value={formData.uCapacity} onChange={e => setFormData({...formData, uCapacity: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                                    <button type="button" onClick={() => { setIsAddModalOpen(false); setEditEntityId(null); }} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors">
                                        {editEntityId ? 'Save Changes' : 'Create Entity'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-4 mb-6">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Confirm Delete</h3>
                                    <p className="text-sm text-slate-400">Are you sure you want to delete this {deleteTarget.type}? This action may cascade delete child entities.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 flex-1 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button onClick={confirmDeleteEntity} className="px-6 py-2 flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
