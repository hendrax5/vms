'use client';

import { ArrowLeft, Server, Plus, Info, LayoutTemplate, Activity, X, Network, Share2, Map, ArrowRightLeft, History, Edit2, Trash2, Eye, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function RackElevationPage() {
    const params = useParams();
    const router = useRouter();
    const rackId = params.id as string;

    const [rack, setRack] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
    const [perspective, setPerspective] = useState<'FRONT' | 'REAR' | 'BOTH'>('FRONT');
    const [draggedEq, setDraggedEq] = useState<any>(null);

    // Manual CRUD states
    const [isEqModalOpen, setIsEqModalOpen] = useState(false);
    const [eqFormData, setEqFormData] = useState({ id: null, name: '', equipmentType: 'SERVER', uStart: 1, uEnd: 1, orientation: 'FRONT' });

    // Session and Permissions
    const { data: session } = useSession();
    const rawRole = (session?.user as any)?.role;
    const roleName = typeof rawRole === 'object' ? rawRole?.name : rawRole;
    const userRole = (roleName || '').toLowerCase().replace(/\s+/g, '') || '';
    const userCustomerId = (session?.user as any)?.customerId || null;
    
    const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
    const isTenantAdmin = ['tenantadmin', 'tenantstaff'].includes(userRole);
    
    let canEdit = false;
    if (isInternalAdmin) {
        canEdit = true;
    } else if (isTenantAdmin && rack) {
        if (rack.customerId === null || (userCustomerId !== null && Number(rack.customerId) === Number(userCustomerId))) {
            canEdit = true;
        }
    }

    useEffect(() => {
        fetchRackDetails();
        fetchAuditLogs();
    }, [rackId]);

    const fetchRackDetails = async () => {
        try {
            const res = await fetch(`/api/racks/${rackId}`);
            if (res.ok) {
                const data = await res.json();
                setRack(data);
            }
        } catch (error) {
            console.error('Error fetching rack details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await fetch(`/api/racks/${rackId}/audit`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Facility Data</p>
            </div>
        );
    }

    if (!rack) {
        return <div className="text-center text-red-400 py-12">Failed to load rack data.</div>;
    }

    const totalU = rack.uCapacity || 42;
    const uArray = Array.from({ length: totalU }, (_, i) => totalU - i);
    const equipments = rack.equipments || [];

    const visibleEquipments = equipments.filter((eq: any) => {
        const o = eq.orientation || 'FRONT';
        if (perspective === 'BOTH') return true;
        if (perspective === 'FRONT') return o === 'FRONT' || o === 'BOTH';
        if (perspective === 'REAR') return o === 'BACK' || o === 'BOTH';
        return false;
    });

    const getEquipmentAtU = (u: number) => {
        return visibleEquipments.find((eq: any) => u >= eq.uStart && u <= eq.uEnd);
    };

    const handleDragStart = (e: React.DragEvent, eq: any) => {
        setDraggedEq(eq);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', eq.id.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetU: number) => {
        e.preventDefault();
        if (!canEdit) {
            alert("You do not have permission to edit this rack.");
            return;
        }
        if (!draggedEq) return;

        if (!isInternalAdmin && isTenantAdmin) {
            const ownsRack = userCustomerId !== null && Number(rack.customerId) === Number(userCustomerId);
            const ownsEq = userCustomerId !== null && (Number(draggedEq.customerId) === Number(userCustomerId) || (draggedEq.customerId === null && draggedEq.equipmentType !== 'PATCH_PANEL'));
            if (!ownsRack && !ownsEq) {
                alert("You do not have permission to move this specific equipment.");
                setDraggedEq(null);
                return;
            }
        }

        const size = draggedEq.uEnd - draggedEq.uStart + 1;
        const newUEnd = targetU;
        const newUStart = targetU - size + 1;

        if (newUStart < 1 || newUEnd > totalU) {
            alert("Insufficient U-Space to fit this equipment here.");
            setDraggedEq(null);
            return;
        }

        const collided = visibleEquipments.some((eq: any) => {
            if (eq.id === draggedEq.id) return false;
            return Math.max(newUStart, eq.uStart) <= Math.min(newUEnd, eq.uEnd);
        });

        if (collided) {
            alert("Collision detected with another device. Move it first.");
            setDraggedEq(null);
            return;
        }

        const updatedEqs = equipments.map((eq: any) => 
            eq.id === draggedEq.id ? { ...eq, uStart: newUStart, uEnd: newUEnd } : eq
        );
        setRack({ ...rack, equipments: updatedEqs });
        setDraggedEq(null);

        try {
            const res = await fetch(`/api/racks/equipments/${draggedEq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uStart: newUStart, uEnd: newUEnd, rackId: rack.id })
            });
            if (res.ok) {
                fetchAuditLogs();
            } else {
                fetchRackDetails();
                alert('Failed to update equipment coordinates.');
            }
        } catch (err) {
            fetchRackDetails();
            console.error(err);
        }
    };

    const handleSaveEq = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = eqFormData.id ? `/api/racks/equipments/${eqFormData.id}` : '/api/racks/equipments';
        const method = eqFormData.id ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...eqFormData, rackId: parseInt(rackId) })
            });
            if (!res.ok) {
                const err = await res.json();
                alert('Error processing equipment: ' + err.error);
                return;
            }
            setIsEqModalOpen(false);
            fetchRackDetails();
            fetchAuditLogs();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteEq = async (id: number) => {
        const eqToDelete = equipments.find((eq: any) => eq.id === id);
        if (eqToDelete && !isInternalAdmin && isTenantAdmin) {
            const ownsRack = userCustomerId !== null && Number(rack.customerId) === Number(userCustomerId);
            const ownsEq = userCustomerId !== null && (Number(eqToDelete.customerId) === Number(userCustomerId) || (eqToDelete.customerId === null && eqToDelete.equipmentType !== 'PATCH_PANEL'));
            if (!ownsRack && !ownsEq) {
                alert("You do not have permission to delete this specific equipment.");
                return;
            }
        }

        if (!confirm('Are you sure you want to uninstall and remove this equipment?')) return;
        try {
            const res = await fetch(`/api/racks/equipments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete equipment');
            fetchRackDetails();
            fetchAuditLogs();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto font-sans">
            <button 
                onClick={() => router.push('/dashboard/racks')}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Fleet
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-emerald-500" />
                        {rack.name}
                    </h1>
                    <p className="text-slate-500 mt-1 text-xs font-bold tracking-[0.2em] uppercase">
                        {rack.row?.room?.datacenter?.name} • {rack.row?.room?.name} • Row {rack.row?.name}
                    </p>
                </div>
                {canEdit && (
                <button
                    onClick={() => {
                        setEqFormData({ id: null, name: '', equipmentType: 'SERVER', uStart: 1, uEnd: 1, orientation: perspective === 'BOTH' ? 'FRONT' : perspective });
                        setIsEqModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Install Device
                </button>
                )}
            </div>

            <div className="flex items-center gap-2 bg-slate-900/40 border border-white/10 p-2 rounded-2xl backdrop-blur-2xl w-fit">
                {[
                    { id: 'FRONT', label: 'Front View', icon: Eye },
                    { id: 'REAR', label: 'Rear View', icon: RotateCw },
                    { id: 'BOTH', label: 'X-Ray (Full)', icon: ArrowRightLeft }
                ].map((p) => (
                    <button 
                        key={p.id}
                        onClick={() => setPerspective(p.id as any)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${perspective === p.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                    >
                        <p.icon className="w-3.5 h-3.5" /> {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl flex flex-col items-center">
                    <div className="w-full max-w-[280px] bg-slate-950 border-[6px] border-slate-800 rounded-xl p-1 shadow-[0_0_100px_rgba(0,0,0,0.8)_inset] relative">
                         <div className="border border-slate-800 w-full mb-3 h-6 bg-slate-900 rounded-sm flex items-center justify-center overflow-hidden">
                            <div className="flex gap-1">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="w-6 h-0.5 bg-slate-800"></div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-black border border-slate-900 rounded-sm overflow-hidden flex flex-col gap-0.5">
                            {uArray.map(u => {
                                const eq = getEquipmentAtU(u);
                                const isTop = eq && u === eq.uEnd;
                                const isMiddle = eq && u < eq.uEnd && u > eq.uStart;
                                
                                let eqClasses = "bg-slate-900/20 border-slate-800";
                                if (eq) {
                                    const isMine = userCustomerId !== null && (Number(eq.customerId) === Number(userCustomerId) || (eq.customerId === null && eq.equipmentType !== 'PATCH_PANEL'));
                                    eqClasses = isMine ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-800/40 border-slate-700 text-slate-500";
                                    
                                    if (isTop) eqClasses += " rounded-t-md border-t border-x cursor-grab active:cursor-grabbing";
                                    else if (!isMiddle) eqClasses += " rounded-b-md border-b border-x";
                                    else eqClasses += " border-x";
                                }

                                return (
                                    <div 
                                        key={u} 
                                        className="flex items-center gap-2 group/u"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, u)}
                                    >
                                        <div className="w-6 text-right text-[9px] font-mono text-slate-600 group-hover/u:text-emerald-500 transition-colors">{u}</div>
                                        <div 
                                            draggable={isTop && canEdit}
                                            onDragStart={(e) => eq && isTop && canEdit ? handleDragStart(e, eq) : e.preventDefault()}
                                            className={`flex-1 h-7 flex items-center justify-center text-[10px] font-bold overflow-hidden transition-all ${eq ? eqClasses : 'bg-slate-950 border border-slate-900/50 border-dashed rounded-sm text-slate-800 hover:border-emerald-900/50 hover:bg-emerald-950/20 hover:text-emerald-900'}`}
                                        >
                                            {eq && isTop && (
                                                <span className="truncate px-2 flex items-center gap-1.5 pointer-events-none uppercase tracking-tighter">
                                                    {eq.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-6 text-left text-[9px] font-mono text-slate-600 group-hover/u:text-emerald-500 transition-colors">{u}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                    <div className="grid grid-cols-1 gap-4">
                        <h2 className="text-xl font-extrabold text-white uppercase tracking-widest flex items-center gap-3">
                            <Server className="w-5 h-5 text-emerald-500" />
                            Inventory Breakdown
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleEquipments.length === 0 ? (
                                <div className="col-span-full py-12 bg-slate-900/40 border border-white/10 rounded-3xl text-center backdrop-blur-2xl">
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hardware detected in this perspective</p>
                                </div>
                            ) : (
                                visibleEquipments.map((eq: any) => {
                                    const isMine = userCustomerId !== null && (Number(eq.customerId) === Number(userCustomerId) || (eq.customerId === null && eq.equipmentType !== 'PATCH_PANEL'));
                                    return (
                                        <motion.div 
                                            layoutId={`eq-card-${eq.id}`}
                                            key={eq.id} 
                                            className={`bg-slate-900/40 border p-6 rounded-3xl backdrop-blur-2xl group transition-all
                                                ${isMine ? 'border-white/10 hover:border-emerald-500/30' : 'border-white/5 opacity-70'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-3 rounded-2xl ${isMine ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                        <Server className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white uppercase tracking-tight">{eq.name}</h3>
                                                        <p className="text-[10px] font-mono text-slate-500 uppercase">{eq.equipmentType} • U{eq.uStart}-U{eq.uEnd}</p>
                                                    </div>
                                                </div>
                                                {isMine && canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEqFormData(eq); setIsEqModalOpen(true); }} className="p-2 bg-white/5 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-400">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteEq(eq.id)} className="p-2 bg-white/5 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-slate-400">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ports</p>
                                                    <p className="text-lg font-mono font-bold text-white">{eq.ports?.length || 0}</p>
                                                </div>
                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Side</p>
                                                    <p className="text-lg font-mono font-bold text-emerald-500">{eq.orientation || 'FRONT'}</p>
                                                </div>
                                            </div>

                                            {eq.ports && eq.ports.length > 0 && (
                                                <div className="grid grid-cols-8 gap-1">
                                                    {eq.ports.map((port: any) => (
                                                        <div 
                                                            key={port.id}
                                                            title={`P${port.portNumber}: ${port.status}`}
                                                            onClick={() => setSelectedEquipment(eq)}
                                                            className={`aspect-square rounded-sm border flex items-center justify-center text-[8px] font-bold cursor-pointer transition-transform hover:scale-125
                                                                ${port.status === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-blue-500/20 border-blue-500/40 text-blue-400'}
                                                            `}
                                                        >
                                                            {port.portNumber}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl">
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                            <History className="w-5 h-5 text-purple-500" />
                            Audit Trail
                        </h2>
                        
                        <div className="space-y-4">
                            {auditLogs.length === 0 ? (
                                <p className="text-slate-500 text-xs uppercase font-bold text-center py-4">Pristine State: No movements recorded</p>
                            ) : (
                                auditLogs.map((log: any) => (
                                    <div key={log.id} className="flex gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-2xl hover:bg-slate-950 transition-colors">
                                        <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl h-fit">
                                            <ArrowRightLeft className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-xs font-bold text-slate-200 uppercase">{log.equipment?.name}</h4>
                                                <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">{log.user?.name} relocated hardware</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals same as before but styled with Emerald */}
            {/* Modal code would follow here - kept concise for brevity but should be included for full file write */}
            <AnimatePresence>
                {selectedEquipment && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
                        >
                            <div className="p-8 border-b border-white/10 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">{selectedEquipment.name} Ports</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Interconnection Interface</p>
                                </div>
                                <button onClick={() => setSelectedEquipment(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto grid grid-cols-4 md:grid-cols-6 gap-3">
                                {selectedEquipment.ports?.map((port: any) => (
                                    <div key={port.id} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all hover:scale-105
                                        ${port.status === 'AVAILABLE' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/5 border-blue-500/20 text-blue-400'}
                                    `}>
                                        <span className="text-[10px] font-mono font-bold">P{port.portNumber}</span>
                                        <div className={`w-2 h-2 rounded-full ${port.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-[0_0_10px_currentColor]`}></div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isEqModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-extrabold text-white uppercase tracking-widest">Device Provisioning</h2>
                            <button onClick={() => setIsEqModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSaveEq} className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Hardware Label</label>
                                <input type="text" required value={eqFormData.name} onChange={e => setEqFormData({...eqFormData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                                    <select value={eqFormData.equipmentType} onChange={e => setEqFormData({...eqFormData, equipmentType: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                        <option value="SERVER">SERVER</option>
                                        <option value="SWITCH">SWITCH</option>
                                        <option value="ROUTER">ROUTER</option>
                                        <option value="PATCH_PANEL">PATCH_PANEL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Side</label>
                                    <select value={eqFormData.orientation} onChange={e => setEqFormData({...eqFormData, orientation: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                        <option value="FRONT">FRONT</option>
                                        <option value="BACK">REAR</option>
                                        <option value="BOTH">BOTH</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-Start</label>
                                    <input type="number" value={eqFormData.uStart} onChange={e => setEqFormData({...eqFormData, uStart: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-End</label>
                                    <input type="number" value={eqFormData.uEnd} onChange={e => setEqFormData({...eqFormData, uEnd: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/20 transition-all mt-6">Commit Configuration</button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
