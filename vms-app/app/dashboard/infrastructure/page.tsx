'use client';

import { useState, useEffect } from 'react';
import { Network, Server, Box, Layers, Building2, MapPin, Plus, X, Trash2, Edit2, Search, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function InfrastructureTopologyPage() {
    const { data: session } = useSession();
    const [topology, setTopology] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Track selected node in the master-detail Floor Plan view
    const [activeDcId, setActiveDcId] = useState<number | null>(null);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

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

    const filteredTopology = topology.map(dc => {
        if (!searchQuery) return dc;
        const q = searchQuery.toLowerCase();
        const dcMatch = dc.name.toLowerCase().includes(q) || dc.code?.toLowerCase().includes(q) || (dc.region?.name && dc.region.name.toLowerCase().includes(q));
        
        const matchedRooms = dc.rooms?.map((room:any) => {
            const roomMatch = room.name.toLowerCase().includes(q);
            const matchedRows = room.rows?.map((row:any) => {
                const rowMatch = row.name.toLowerCase().includes(q);
                const matchedRacks = row.racks?.filter((rack:any) => rack.name.toLowerCase().includes(q) || rowMatch || roomMatch || dcMatch);
                
                if (matchedRacks?.length > 0 || rowMatch || roomMatch || dcMatch) {
                    return { ...row, racks: matchedRacks };
                }
                return null;
            }).filter((r:any) => r !== null);
            
            if (matchedRows?.length > 0 || roomMatch || dcMatch) {
                return { ...room, rows: matchedRows };
            }
            return null;
        }).filter((r:any) => r !== null);
        
        if (matchedRooms?.length > 0 || dcMatch) {
            return { ...dc, rooms: matchedRooms };
        }
        return null;
    }).filter(dc => dc !== null);

    // Derive selected entities for Floor Plan Map
    const currentDcId = activeDcId || (filteredTopology[0]?.id || null);
    const currentDc = filteredTopology.find(dc => dc.id === currentDcId) || filteredTopology[0];
    const currentRoomId = activeRoomId || (currentDc?.rooms?.[0]?.id || null);
    const currentRoom = currentDc?.rooms?.find((r:any) => r.id === currentRoomId) || currentDc?.rooms?.[0];

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                         <Network className="w-8 h-8 text-emerald-500" /> Infrastructure Topology
                     </h1>
                     <p className="text-slate-400 mt-1">Full hierarchical view of regions, datacenters, rooms, rows, and racks.</p>
                 </div>
                 <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 mr-3">
                     <button 
                         onClick={() => setViewMode('grid')} 
                         className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                         title="Grid View"
                     >
                         <LayoutGrid className="w-4 h-4" />
                     </button>
                     <button 
                         onClick={() => setViewMode('list')} 
                         className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                         title="List View"
                     >
                         <List className="w-4 h-4" />
                     </button>
                 </div>
                 <div className="relative w-full md:w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                     <input 
                         type="text" 
                         className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                         placeholder="Search facility..."
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                     />
                 </div>
                 <div className="flex gap-3">
                     {canEdit && (
                         <button onClick={() => { setEditEntityId(null); setIsAddModalOpen(true); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                             <Plus className="w-4 h-4" /> Add Facility
                         </button>
                     )}
                 </div>
            </div>

            {/* Topology Master-Detail Rendering */}
            <div className="flex flex-col xl:flex-row gap-6">
                 
                 {/* Left Sidebar: Navigating Datacenters and Rooms */}
                 <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
                     {canEdit && (
                         <div className="flex justify-between items-center px-1">
                             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                 <Building2 className="w-4 h-4" /> Datacenters
                             </h2>
                             <button onClick={() => { setEditEntityId(null); setAddType('datacenter'); setIsAddModalOpen(true); }} className="text-[10px] uppercase font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition-colors" title="Add Datacenter">
                                 <Plus className="w-3 h-3" /> Add
                             </button>
                         </div>
                     )}
                     
                     {filteredTopology.length === 0 ? (
                         <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-center text-neutral-500">
                             No mapping data available
                         </div>
                     ) : (
                         filteredTopology.map((dc, i) => (
                             <motion.div 
                                 key={dc.id}
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: i * 0.05 }}
                                 className={`bg-neutral-900 border transition-all rounded-2xl overflow-hidden ${currentDcId === dc.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-neutral-800 hover:border-neutral-700'}`}
                             >
                                 <div 
                                     className="p-4 cursor-pointer flex items-center justify-between group"
                                     onClick={() => { setActiveDcId(dc.id); setActiveRoomId(null); }}
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${currentDcId === dc.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                            <Building2 className="w-4 h-4" />
                                         </div>
                                         <div>
                                             <h3 className={`font-bold text-sm leading-tight ${currentDcId === dc.id ? 'text-white' : 'text-neutral-300'}`}>{dc.name}</h3>
                                             <p className="text-[10px] text-neutral-500 font-mono tracking-wider">{dc.code} • {dc.region?.name || 'Global'}</p>
                                         </div>
                                     </div>
                                     {canEdit && (
                                         <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                             <button onClick={(e) => handleEditClick(e, 'datacenter', dc, dc.regionId?.toString())} className="p-1.5 text-neutral-400 hover:text-emerald-400"><Edit2 className="w-3 h-3" /></button>
                                             <button onClick={(e) => triggerDelete(e, 'datacenter', dc.id)} className="p-1.5 text-neutral-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                         </div>
                                     )}
                                 </div>
                                 
                                 {/* Expanded Rooms List */}
                                 {currentDcId === dc.id && (
                                     <div className="bg-[#0a0a0a] border-t border-neutral-800/50 p-2">
                                         {canEdit && (
                                             <div className="px-3 pb-2 pt-1 flex justify-between items-center">
                                                 <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Rooms</span>
                                                 <button onClick={(e) => { e.stopPropagation(); setEditEntityId(null); setAddType('room'); setFormData({...formData, datacenterId: dc.id.toString()}); setIsAddModalOpen(true); }} className="text-[10px] uppercase font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition-colors">
                                                     <Plus className="w-3 h-3" /> Add Room
                                                 </button>
                                             </div>
                                         )}
                                         {dc.rooms?.length > 0 ? (
                                             <div className="space-y-1">
                                                 {dc.rooms.map((room:any) => (
                                                     <div 
                                                         key={room.id}
                                                         onClick={(e) => { e.stopPropagation(); setActiveRoomId(room.id); }}
                                                         className={`px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer group/room transition-colors ${currentRoomId === room.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' : 'text-neutral-400 hover:bg-neutral-900 border-transparent hover:text-neutral-300'}`}
                                                     >
                                                         <div className="flex items-center gap-2">
                                                             <Layers className={`w-3.5 h-3.5 ${currentRoomId === room.id ? 'text-emerald-200' : 'text-neutral-500'}`} />
                                                             {room.name}
                                                         </div>
                                                         {canEdit && (
                                                             <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover/room:opacity-100 transition-opacity">
                                                                 <button onClick={(e) => handleEditClick(e, 'room', room, dc.id.toString())} className="p-1 text-neutral-400 hover:text-emerald-400"><Edit2 className="w-3 h-3" /></button>
                                                                 <button onClick={(e) => triggerDelete(e, 'room', room.id)} className="p-1 text-neutral-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                                             </div>
                                                         )}
                                                     </div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <div className="text-center py-4 text-xs font-medium text-neutral-600">No rooms mapped</div>
                                         )}
                                     </div>
                                 )}
                             </motion.div>
                         ))
                     )}
                 </div>

                 {/* Right Canvas: Floor Plan */}
                 <div className="flex-1 bg-black border border-neutral-800 rounded-2xl min-h-[600px] overflow-hidden flex flex-col relative shadow-2xl">
                     {currentRoom ? (
                         <>
                             {/* Floor map Header */}
                             <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex justify-between items-center z-10 sticky top-0">
                                 <div className="flex items-center gap-3">
                                     <div className="p-1.5 bg-neutral-800 rounded-md">
                                         <MapPin className="w-4 h-4 text-emerald-400" />
                                     </div>
                                     <div>
                                         <h2 className="text-sm font-bold text-white tracking-wide">
                                             <span className="text-neutral-400 font-normal">Map View:</span> {currentDc?.name} <span className="text-neutral-600">/</span> {currentRoom.name}
                                         </h2>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <div className="text-xs text-neutral-500 font-mono bg-black px-3 py-1 rounded-full border border-neutral-800">
                                         {currentRoom.rows?.length || 0} ROWS ACTIVE
                                     </div>
                                     {canEdit && (
                                         <button onClick={() => { setEditEntityId(null); setAddType('row'); setFormData({...formData, roomId: currentRoom.id.toString()}); setIsAddModalOpen(true); }} className="text-[10px] uppercase font-bold text-white hover:text-emerald-400 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-full transition-colors shadow-lg shadow-emerald-600/20">
                                             <Plus className="w-3 h-3" /> Add Row
                                         </button>
                                     )}
                                 </div>
                             </div>
                             
                             {/* 2D Canvas Area */}
                             <div className="flex-1 p-8 overflow-auto relative bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:24px_24px]">
                                 <div className="space-y-16 max-w-6xl mx-auto pb-10">
                                     {currentRoom.rows?.map((row: any) => (
                                         <div key={row.id} className="relative group/row">
                                             {/* Row Divider / Aisle Marker */}
                                             <div className="flex items-center gap-4 mb-4">
                                                 <div className="w-2 h-8 bg-emerald-500 rounded-r-md"></div>
                                                 <h4 className="text-sm font-black text-neutral-300 uppercase tracking-widest flex items-center gap-2">
                                                     ROW {row.name}
                                                 </h4>
                                                 <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent flex-grow"></div>
                                                 
                                                 <div className="absolute right-0 flex items-center gap-2 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                                                     {canEdit && (
                                                         <>
                                                             <button onClick={(e) => { e.stopPropagation(); setEditEntityId(null); setAddType('rack'); setFormData({...formData, rowId: row.id.toString(), uCapacity: '42'}); setIsAddModalOpen(true); }} className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-full transition-colors mr-2">
                                                                 <Plus className="w-3 h-3" /> Add Rack
                                                             </button>
                                                             <button onClick={(e) => handleEditClick(e, 'row', row, currentRoom.id.toString())} className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors" title="Edit Row"><Edit2 className="w-3.5 h-3.5" /></button>
                                                             <button onClick={(e) => triggerDelete(e, 'row', row.id)} className="p-1 text-neutral-400 hover:text-red-400 transition-colors" title="Delete Row"><Trash2 className="w-3.5 h-3.5" /></button>
                                                         </>
                                                     )}
                                                 </div>
                                             </div>
                                             
                                             {/* Racks Grouping Area */}
                                             <div className={viewMode === 'grid' 
                                                 ? "flex flex-wrap gap-1 md:gap-2 px-6" 
                                                 : "flex flex-col gap-2 px-6 max-w-3xl"
                                             }>
                                                 {row.racks?.map((rack: any) => (
                                                     viewMode === 'grid' ? (
                                                         <Link href={`/dashboard/racks/${rack.id}`} key={rack.id} className="block group/rack relative">
                                                             {/* 2D Top-Down Rectangular Rack Simulation */}
                                                             <div className="bg-neutral-900 border border-neutral-800 w-20 h-28 sm:w-24 sm:h-32 rounded-sm flex flex-col items-center justify-between py-3 hover:border-emerald-500 hover:bg-neutral-800 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all overflow-hidden relative">
                                                                 {/* Intake indicator */}
                                                                 <div className="w-full h-1 bg-emerald-500/20 absolute top-0"></div>
                                                                 
                                                                 <Server className="w-6 h-6 text-neutral-600 group-hover/rack:text-emerald-400 transition-colors mt-2" />
                                                                 
                                                                 <div className="text-center w-full px-1">
                                                                     <p className="text-[11px] sm:text-xs font-bold text-neutral-300 truncate w-full">{rack.name}</p>
                                                                     <p className="text-[9px] text-neutral-500 uppercase mt-0.5">{rack.uCapacity}U</p>
                                                                 </div>
                                                                 
                                                                 {/* Exhaust indicator */}
                                                                 <div className="w-full h-1 bg-red-500/20 absolute bottom-0"></div>
                                                             </div>
                                                             
                                                             {/* Floating Ghost Actions on Hover map */}
                                                             {canEdit && (
                                                                 <div 
                                                                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                     className="absolute -top-3 -right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover/rack:opacity-100 transition-opacity z-10"
                                                                 >
                                                                     <button onClick={(e) => handleEditClick(e, 'rack', rack, row.id.toString())} className="p-1.5 bg-neutral-800 shadow shadow-black border border-neutral-700 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-600 transition-colors"><Edit2 className="w-3 h-3" /></button>
                                                                     <button onClick={(e) => triggerDelete(e, 'rack', rack.id)} className="p-1.5 bg-neutral-800 shadow shadow-black border border-neutral-700 rounded-md text-red-400 hover:text-white hover:bg-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                                 </div>
                                                             )}
                                                         </Link>
                                                     ) : (
                                                         <Link href={`/dashboard/racks/${rack.id}`} key={rack.id} className="block group/rack relative">
                                                             <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex items-center justify-between hover:border-emerald-500/50 hover:bg-neutral-800 transition-all">
                                                                 <div className="flex items-center gap-4">
                                                                     <Server className="w-5 h-5 text-neutral-500 group-hover/rack:text-emerald-400 transition-colors" />
                                                                     <div>
                                                                         <p className="text-sm font-bold text-neutral-200">{rack.name}</p>
                                                                         <p className="text-xs text-neutral-500 font-mono mt-0.5">{rack.uCapacity}U • {rack.equipments?.length || 0} Assets deployed</p>
                                                                     </div>
                                                                 </div>
                                                                 {canEdit && (
                                                                     <div 
                                                                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                         className="flex gap-2 opacity-100 md:opacity-0 md:group-hover/rack:opacity-100 transition-opacity"
                                                                     >
                                                                         <button onClick={(e) => handleEditClick(e, 'rack', rack, row.id.toString())} className="p-1.5 text-emerald-500 hover:text-emerald-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                                         <button onClick={(e) => triggerDelete(e, 'rack', rack.id)} className="p-1.5 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </Link>
                                                     )
                                                 ))}
                                                 {row.racks?.length === 0 && (
                                                     <div className="py-6 text-center border border-dashed border-neutral-800 rounded-lg text-neutral-600 text-xs tracking-wider uppercase font-bold w-full max-w-sm">No racks deployed</div>
                                                 )}
                                             </div>
                                         </div>
                                     ))}
                                     
                                     {currentRoom.rows?.length === 0 && (
                                         <div className="text-center py-20">
                                             <Layers className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
                                             <div className="text-neutral-500">Floor map is empty</div>
                                             <div className="text-xs text-neutral-600 mt-1">Configure rows to visualize this room</div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8">
                             <MapPin className="w-16 h-16 text-neutral-800 mb-4" />
                             <p className="text-lg">Select a facility room from the sidebar to view floor plan</p>
                         </div>
                     )}
                 </div>
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                {addType === 'datacenter' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Facility Code</label>
                                            <input 
                                                type="text" required placeholder="e.g. JKT-1"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                                value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Parent Region</label>
                                            <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                                        <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                            value={formData.datacenterId} onChange={e => setFormData({...formData, datacenterId: e.target.value})}>
                                            <option value="">Select Datacenter</option>
                                            {topology.map(dc => <option key={dc.id} value={dc.id}>{dc.name} [{dc.code}]</option>)}
                                        </select>
                                    </div>
                                )}

                                {addType === 'row' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Parent Room</label>
                                        <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                                            <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                                value={formData.uCapacity} onChange={e => setFormData({...formData, uCapacity: e.target.value})}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                                    <button type="button" onClick={() => { setIsAddModalOpen(false); setEditEntityId(null); }} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
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
