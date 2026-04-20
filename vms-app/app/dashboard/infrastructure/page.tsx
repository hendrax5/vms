'use client';

import { useState, useEffect, useRef } from 'react';
import { Network, Server, Box, Layers, Building2, MapPin, Plus, X, Trash2, Edit2, Search, LayoutGrid, List, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AssetContextPanel from '../../components/dashboard/AssetContextPanel';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import AssetContextPanel from '../../components/dashboard/AssetContextPanel';

export default function InfrastructureTopologyPage() {
    const { data: session } = useSession();
    const [topology, setTopology] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track selected node in the master-detail Floor Plan view
    const [activeDcId, setActiveDcId] = useState<number | null>(null);
    const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

    const [selectedAsset, setSelectedAsset] = useState<{ type: string; data: any } | null>(null);

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

    const handleEditClick = (type: string, entity: any, parentId?: string) => {
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
        setSelectedAsset(null); // Tutup panel context
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

    const triggerDelete = (type: string, id: number, name: string) => {
        setDeleteTarget({ type, id });
    };

    const handleContextAddChild = (parentType: string, parentData: any) => {
        let childType = '';
        let initialData = { name: '', code: '', regionId: '', datacenterId: '', roomId: '', rowId: '', uCapacity: '42' };
        
        if (parentType === 'datacenter') {
            childType = 'room';
            initialData.datacenterId = parentData.id.toString();
        } else if (parentType === 'room') {
            childType = 'row';
            initialData.roomId = parentData.id.toString();
        } else if (parentType === 'row') {
            childType = 'rack';
            initialData.rowId = parentData.id.toString();
        } else if (parentType === 'rack') {
            // Kita arahkan pengguna ke halaman Rack Management untuk add equipment
            window.location.href = `/dashboard/racks/${parentData.id}`;
            return;
        }

        if (childType) {
            setAddType(childType);
            setEditEntityId(null);
            setFormData(initialData);
            setIsAddModalOpen(true);
            setSelectedAsset(null);
        }
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
    }).filter((dc: any) => dc !== null);

    const handleExport = () => {
        const dataToExport: any[] = [];
        topology.forEach(dc => {
            if (!dc.rooms || dc.rooms.length === 0) {
                dataToExport.push({
                    "Region Name": dc.region.name,
                    "Datacenter Code": dc.code,
                    "Datacenter Name": dc.name,
                    "Room Name": "",
                    "Row Name": "",
                    "Rack Name": "",
                    "U Capacity": "",
                    "Tenant Code": ""
                });
            } else {
                dc.rooms.forEach((room: any) => {
                    if (!room.rows || room.rows.length === 0) {
                        dataToExport.push({
                            "Region Name": dc.region.name,
                            "Datacenter Code": dc.code,
                            "Datacenter Name": dc.name,
                            "Room Name": room.name,
                            "Row Name": "",
                            "Rack Name": "",
                            "U Capacity": "",
                            "Tenant Code": ""
                        });
                    } else {
                        room.rows.forEach((row: any) => {
                            if (!row.racks || row.racks.length === 0) {
                                dataToExport.push({
                                    "Region Name": dc.region.name,
                                    "Datacenter Code": dc.code,
                                    "Datacenter Name": dc.name,
                                    "Room Name": room.name,
                                    "Row Name": row.name,
                                    "Rack Name": "",
                                    "U Capacity": "",
                                    "Tenant Code": ""
                                });
                            } else {
                                row.racks.forEach((rack: any) => {
                                    dataToExport.push({
                                        "Region Name": dc.region.name,
                                        "Datacenter Code": dc.code,
                                        "Datacenter Name": dc.name,
                                        "Room Name": room.name,
                                        "Row Name": row.name,
                                        "Rack Name": rack.name,
                                        "U Capacity": rack.uCapacity || 42,
                                        "Tenant Code": rack.customer?.code || ""
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Topology");
        XLSX.writeFile(wb, `Topology_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                
                const payloads = data.map((row: any) => ({
                    regionName: row['Region Name'],
                    dcCode: row['Datacenter Code']?.toString(),
                    dcName: row['Datacenter Name'],
                    roomName: row['Room Name'],
                    rowName: row['Row Name'],
                    rackName: row['Rack Name']?.toString(),
                    uCapacity: row['U Capacity'] ? parseInt(row['U Capacity']) : 42,
                    tenantCode: row['Tenant Code']?.toString()
                })).filter((p:any) => p.rackName && p.dcName && p.roomName && p.rowName);

                if (payloads.length === 0) {
                    toast.error("No valid hierarchy found. Needs at least Region, DC, Room, Row, Rack Names.");
                    return;
                }

                const res = await fetch('/api/topology/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloads)
                });

                const result = await res.json();
                if (res.ok) {
                    toast.success(`Import finished! Success: ${result.successCount}, Failed: ${result.failedCount}`);
                    if (result.errors?.length) {
                        toast.error(`Some failed: ${result.errors[0]?.message}`);
                    }
                    loadData();
                } else {
                    toast.error(result.error || 'Import failed');
                }
            } catch (err: any) {
                console.error(err);
                toast.error(err.message || 'Error processing excel file');
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

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
                 <div className="flex bg-[#111] border border-neutral-800 rounded-lg overflow-hidden shadow-lg ml-auto">
                    {canEdit && (
                        <>
                            <button 
                                onClick={handleExport}
                                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors border-r border-neutral-800"
                            >
                                <Download className="w-4 h-4" /> Export
                            </button>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors border-r border-neutral-800"
                            >
                                <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import'}
                            </button>
                            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                            <button onClick={() => { setEditEntityId(null); setIsAddModalOpen(true); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Facility
                            </button>
                        </>
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
                             <button onClick={() => { setEditEntityId(null); setAddType('datacenter'); setFormData({ name: '', code: '', regionId: '', datacenterId: '', roomId: '', rowId: '', uCapacity: '42' }); setIsAddModalOpen(true); }} className="text-[10px] uppercase font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition-colors" title="Add Datacenter">
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
                                     onClick={() => { setActiveDcId(dc.id); setActiveRoomId(null); setSelectedAsset({ type: 'datacenter', data: dc }); }}
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
                                 </div>
                                 
                                 {/* Expanded Rooms List */}
                                 {currentDcId === dc.id && (
                                     <div className="bg-[#0a0a0a] border-t border-neutral-800/50 p-2">
                                         {dc.rooms?.length > 0 ? (
                                             <div className="space-y-1">
                                                 {dc.rooms.map((room:any) => (
                                                    <div 
                                                        onClick={() => {
                                                            setActiveDcId(dc.id); 
                                                            setActiveRoomId(room.id);
                                                            setSelectedAsset({ type: 'room', data: room });
                                                        }}
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex justify-between items-center ${activeRoomId === room.id ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-slate-800/30 border-white/5 hover:bg-slate-700/50 hover:border-white/10 text-slate-300'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${activeRoomId === room.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                <Layers className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold">{room.name}</h4>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{room.rows?.length || 0} Rows</p>
                                                            </div>
                                                        </div>
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
                                         <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                             <Layers className="w-6 h-6 text-emerald-400" />
                                             {currentRoom.name} <span className="text-slate-500 font-normal">| Floor Plan</span>
                                         </h2>
                                     </div>
                                 </div>
                             </div>
                             
                             {/* 2D Canvas Area */}
                             <div className="flex-1 p-8 overflow-auto relative bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:24px_24px]">
                                 <div className="space-y-16 max-w-6xl mx-auto pb-10">
                                     {currentRoom.rows?.map((row: any) => (
                                         <div key={row.id} className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
                                             <div 
                                                className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 cursor-pointer group"
                                                onClick={() => setSelectedAsset({ type: 'row', data: row })}
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                                                         <MapPin className="w-5 h-5" />
                                                     </div>
                                                     <div>
                                                         <h3 className="text-lg font-bold text-slate-200 group-hover:text-amber-400 transition-colors">Row {row.name}</h3>
                                                         <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">{row.racks?.length || 0} Racks Installed</p>
                                                     </div>
                                                 </div>
                                             </div>
                                             
                                             {/* Racks Grouping Area */}
                                             <div className={viewMode === 'grid' 
                                                 ? "flex flex-wrap gap-4" 
                                                 : "flex flex-col gap-2 max-w-3xl"
                                             }>
                                                 {row.racks?.map((rack: any) => (
                                                    viewMode === 'grid' ? (
                                                        <div 
                                                            key={rack.id} 
                                                            className="w-24 h-32 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/50 rounded-xl relative group cursor-pointer hover:border-purple-500/50 transition-all flex flex-col overflow-hidden shadow-lg"
                                                            onClick={() => setSelectedAsset({ type: 'rack', data: rack })}
                                                        >
                                                            <div className="bg-slate-950/80 p-1.5 text-center border-b border-white/5">
                                                                <div className="text-[10px] font-bold text-white uppercase tracking-wider">{rack.name}</div>
                                                            </div>
                                                            <div className="flex-1 p-2 grid grid-cols-2 gap-1 content-center">
                                                                {Array.from({ length: 6 }).map((_, i) => (
                                                                    <div key={i} className="h-1 bg-white/5 rounded-full" />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            key={rack.id} 
                                                            className="bg-slate-900 border border-white/5 p-3 rounded-lg flex items-center justify-between hover:border-purple-500/50 hover:bg-slate-800/80 transition-all cursor-pointer"
                                                            onClick={() => setSelectedAsset({ type: 'rack', data: rack })}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                                                                    <Box className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-200">{rack.name}</p>
                                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{rack.uCapacity}U • {rack.equipments?.length || 0} Assets deployed</p>
                                                                </div>
                                                            </div>
                                                        </div>
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
                                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-emerald-500/20">
                                        Save Facility
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AssetContextPanel 
                isOpen={!!selectedAsset} 
                asset={selectedAsset} 
                onClose={() => setSelectedAsset(null)} 
                onEdit={handleEditClick} 
                onDelete={triggerDelete}
                onAddChild={handleContextAddChild}
                canEdit={canEdit}
            />

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
