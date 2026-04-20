'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Server, Search, Building2, Layers, MapPin, Box, Filter, AlertCircle, Plus, Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import AssetContextPanel from '../../components/dashboard/AssetContextPanel';
import DeviceModal from '../../components/dashboard/racks/details/DeviceModal';

export default function AssetInventoryPage() {
    const { data: session } = useSession();
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

    const [equipments, setEquipments] = useState<any[]>([]);
    const [rawTopology, setRawTopology] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Filters
    const [selectedDc, setSelectedDc] = useState('All');
    const [selectedRoom, setSelectedRoom] = useState('All');
    
    // Context Panel State
    const [selectedAsset, setSelectedAsset] = useState<{ type: string; data: any } | null>(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<any>(null);

    const fetchAssets = () => {
        setLoading(true);
        fetch('/api/topology')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setRawTopology(data);
                    const flattened: any[] = [];
                    data.forEach((dc: any) => {
                        dc.rooms?.forEach((room: any) => {
                            room.rows?.forEach((row: any) => {
                                row.racks?.forEach((rack: any) => {
                                    rack.equipments?.forEach((eq: any) => {
                                        flattened.push({
                                            ...eq,
                                            location: {
                                                datacenter: dc.name,
                                                room: room.name,
                                                row: row.name,
                                                rack: rack.name,
                                                rackId: rack.id,
                                                datacenterId: dc.id,
                                                roomId: room.id,
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                    setEquipments(flattened);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    // Extract unique DCs and Rooms for filters
    const dcs = ['All', ...Array.from(new Set(equipments.map(e => e.location.datacenter)))];
    const rooms = ['All', ...Array.from(new Set(equipments.filter(e => selectedDc === 'All' || e.location.datacenter === selectedDc).map(e => e.location.room)))];

    const filteredEquipments = equipments.filter(eq => {
        const matchesSearch = eq.name.toLowerCase().includes(search.toLowerCase()) || 
                              eq.model?.toLowerCase().includes(search.toLowerCase()) ||
                              eq.vendor?.toLowerCase().includes(search.toLowerCase());
        const matchesDc = selectedDc === 'All' || eq.location.datacenter === selectedDc;
        const matchesRoom = selectedRoom === 'All' || eq.location.room === selectedRoom;
        
        return matchesSearch && matchesDc && matchesRoom;
    });

    const handleRowClick = (eq: any) => {
        setSelectedAsset({ type: 'equipment', data: eq });
    };

    const triggerDelete = async (type: string, id: number, name: string) => {
        if (!confirm(`Are you sure you want to decommission ${name}?`)) return;
        
        try {
            const res = await fetch(`/api/racks/equipments?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setEquipments(prev => prev.filter(e => e.id !== id));
                setSelectedAsset(null);
            } else {
                alert('Failed to delete equipment');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const handleExport = () => {
        const dataToExport = filteredEquipments.map(eq => ({
            "ID (Optional)": eq.id,
            "Hardware Label / Name": eq.name,
            Type: eq.type,
            Datacenter: eq.location.datacenter,
            Room: eq.location.room,
            Row: eq.location.row,
            Rack: eq.location.rack,
            "U Start": eq.uStart,
            "U End / Size": eq.uEnd || eq.uSize,
            "Serial Number": eq.serialNumber || '',
            "Asset Tag": eq.assetTag || '',
            Status: eq.status || 'Active',
            Orientation: eq.orientation || 'FRONT',
            "Port Count": eq.portCount || 24,
            Brand: eq.vendor || '',
            Model: eq.model || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Assets");
        XLSX.writeFile(wb, `VMS_Assets_${new Date().toISOString().slice(0,10)}.xlsx`);
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
                
                const payloads = data.map((row: any) => {
                    const dcName = row['Datacenter'];
                    const roomName = row['Room'];
                    const rowName = row['Row'];
                    const rackName = row['Rack'];

                    let mappedRackId = null;
                    if (rawTopology.length) {
                        for (const dc of rawTopology) {
                            if (dcName && dc.name !== dcName) continue;
                            for (const room of (dc.rooms || [])) {
                                if (roomName && room.name !== roomName) continue;
                                for (const rw of (room.rows || [])) {
                                    if (rowName && rw.name !== rowName) continue;
                                    for (const rk of (rw.racks || [])) {
                                        if (rk.name === rackName) {
                                            mappedRackId = rk.id;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return {
                        id: row['ID (Optional)'] || undefined,
                        name: row['Hardware Label / Name'],
                        equipmentType: row['Type'] || 'SERVER',
                        rackId: mappedRackId, 
                        uStart: parseInt(row['U Start']) || 1,
                        uEnd: parseInt(row['U End / Size']) || 1, 
                        serialNumber: row['Serial Number'] || '',
                        assetTag: row['Asset Tag'] || '',
                        status: row['Status'] || 'Active',
                        orientation: row['Orientation'] || 'FRONT',
                        portCount: parseInt(row['Port Count']) || 24,
                    };
                });

                if (payloads.length === 0) throw new Error("No data found in excel");

                const res = await fetch('/api/racks/equipments/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloads)
                });

                const result = await res.json();
                if (res.ok) {
                    toast.success(`Import finished! Success: ${result.successCount}, Failed: ${result.failedCount}`);
                    if (result.errors?.length) {
                        console.warn("Import errors:", result.errors);
                        toast.error(`Some imports failed. Example: ${result.errors[0]?.message}`);
                    }
                    fetchAssets();
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

    return (
        <div className="p-4 md:p-8 space-y-8 relative max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900/50 p-6 rounded-3xl border border-white/5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Server className="w-8 h-8 text-emerald-400" />
                        Asset Inventory
                    </h1>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Comprehensive view of all provisioned IT equipment across facilities.</p>
                </div>
                {isSuperAdmin && (
                    <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                        <button 
                            onClick={handleExport}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-r border-slate-800 whitespace-nowrap"
                        >
                            <Download className="w-4 h-4" /> Export XLS
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-r border-slate-800 whitespace-nowrap"
                        >
                            <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import XLS'}
                        </button>
                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                        <button 
                            onClick={() => { setAssetToEdit(null); setShowEditModal(true); }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 md:px-6 py-3 text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" /> Add Asset
                        </button>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search by hostname, model, or vendor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block pl-10 p-3 placeholder-slate-500 transition-all shadow-inner"
                    />
                </div>
                <div>
                    <select 
                        value={selectedDc}
                        onChange={(e) => { setSelectedDc(e.target.value); setSelectedRoom('All'); }}
                        className="w-full bg-slate-900/80 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 p-3 shadow-inner"
                    >
                        {dcs.map(dc => <option key={dc} value={dc}>{dc === 'All' ? 'All Datacenters' : dc}</option>)}
                    </select>
                </div>
                <div>
                    <select 
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 p-3 shadow-inner"
                        disabled={selectedDc === 'All'}
                    >
                        {rooms.map(room => <option key={room} value={room}>{room === 'All' ? 'All Rooms' : room}</option>)}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-xs uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-bold">Equipment</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold">Type</th>
                                <th className="px-6 py-4 font-bold">Location</th>
                                <th className="px-6 py-4 font-bold text-right">U-Space</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            Loading inventory...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEquipments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                                            <span className="font-bold">No assets found</span>
                                            <span className="text-xs">Adjust your filters to see more results</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEquipments.map((eq, idx) => (
                                    <tr 
                                        key={eq.id} 
                                        onClick={() => handleRowClick(eq)}
                                        className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                                                    <Server className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{eq.name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{eq.vendor} {eq.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                ${eq.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                                  eq.status === 'MAINTENANCE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                                  'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                {eq.status === 'ONLINE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                {eq.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 font-medium capitalize">{(eq.equipmentType || 'Unknown').toLowerCase()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                    <Box className="w-3.5 h-3.5 text-purple-400" /> {eq.location.rack}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" /> {eq.location.datacenter} / {eq.location.room}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm font-mono font-bold text-slate-300">
                                                U{eq.uStart} <span className="text-slate-600">-</span> U{eq.uEnd}
                                            </div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">
                                                {eq.uEnd - eq.uStart + 1}U Size
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AssetContextPanel 
                isOpen={!!selectedAsset} 
                asset={selectedAsset} 
                onClose={() => setSelectedAsset(null)} 
                onEdit={(type, data) => {
                    if (type === 'equipment') {
                        setAssetToEdit(data);
                        setShowEditModal(true);
                        setSelectedAsset(null);
                    } else {
                        alert('Edit for ' + type + ' is under construction');
                    }
                }} 
                onDelete={triggerDelete}
                canEdit={isSuperAdmin}
            />

            <DeviceModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setAssetToEdit(null); }}
                onSubmit={(data) => {
                    const method = data.id ? 'PUT' : 'POST';
                    const url = data.id ? `/api/racks/equipments/${data.id}` : '/api/racks/equipments';
                    
                    fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })
                    .then(res => {
                        if (res.ok) {
                            fetchAssets();
                            setShowEditModal(false);
                            setAssetToEdit(null);
                        } else {
                            res.json().then(d => alert(d.error));
                        }
                    });
                }}
                initialData={assetToEdit}
                perspective="FRONT"
                isInternalAdmin={isSuperAdmin}
                showLocationPicker={true}
            />
        </div>
    );
}
