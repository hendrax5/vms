'use client';

import { ArrowLeft, Server, Plus, Info, LayoutTemplate, Activity, X, Network, Share2, Map, ArrowRightLeft, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RackElevationPage() {
    const params = useParams();
    const router = useRouter();
    const rackId = params.id as string;

    const [rack, setRack] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
    const [perspective, setPerspective] = useState<'FRONT' | 'REAR'>('FRONT');
    const [draggedEq, setDraggedEq] = useState<any>(null);

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
        return <div className="text-center text-slate-400 py-12">Loading Rack Elevation...</div>;
    }

    if (!rack) {
        return <div className="text-center text-red-400 py-12">Failed to load rack data.</div>;
    }

    // U Space array (Top to Bottom)
    const totalU = rack.uCapacity || 42;
    const uArray = Array.from({ length: totalU }, (_, i) => totalU - i);

    const equipments = rack.equipments || [];

    // Filter equipment by Perspective
    const visibleEquipments = equipments.filter((eq: any) => {
        const o = eq.orientation || 'FRONT';
        if (o === 'BOTH') return true;
        if (perspective === 'FRONT' && o === 'FRONT') return true;
        if (perspective === 'REAR' && o === 'BACK') return true;
        return false;
    });

    const getEquipmentAtU = (u: number) => {
        return visibleEquipments.find((eq: any) => u >= eq.uStart && u <= eq.uEnd);
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, eq: any) => {
        setDraggedEq(eq);
        e.dataTransfer.effectAllowed = 'move';
        // Provide visual payload
        e.dataTransfer.setData('text/plain', eq.id.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetU: number) => {
        e.preventDefault();
        if (!draggedEq) return;

        const size = draggedEq.uEnd - draggedEq.uStart + 1;
        
        // Calculate the new boundaries based on targetU (target is where they dropped it)
        // If they drop on U20, and size is 2, it spans U20 and U21.
        // So uEnd = targetU, uStart = targetU - size + 1. 
        // Or if targetU is the bottom-most U, uStart = targetU, uEnd = targetU + size - 1.
        // Usually, the U they hover over tends to be considered the top edge of the device (uEnd).
        const newUEnd = targetU;
        const newUStart = targetU - size + 1;

        if (newUStart < 1 || newUEnd > totalU) {
            alert("Insufficient U-Space to fit this equipment here.");
            setDraggedEq(null);
            return;
        }

        // Collision Check within the CURRENT perspective
        const collided = visibleEquipments.some((eq: any) => {
            if (eq.id === draggedEq.id) return false;
            // Intersection check: max(start1, start2) <= min(end1, end2)
            return Math.max(newUStart, eq.uStart) <= Math.min(newUEnd, eq.uEnd);
        });

        if (collided) {
            alert("Collision detected with another device. Move it first.");
            setDraggedEq(null);
            return;
        }

        // Optimistic UI Update
        const updatedEqs = equipments.map((eq: any) => 
            eq.id === draggedEq.id ? { ...eq, uStart: newUStart, uEnd: newUEnd } : eq
        );
        setRack({ ...rack, equipments: updatedEqs });
        setDraggedEq(null);

        // API Call
        try {
            const res = await fetch(`/api/racks/equipments/${draggedEq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uStart: newUStart, uEnd: newUEnd, rackId: rack.id })
            });
            if (res.ok) {
                fetchAuditLogs(); // Refresh logs after move
            } else {
                fetchRackDetails(); // Revert on failure
                alert('Failed to update equipment coordinates.');
            }
        } catch (err) {
            fetchRackDetails(); // Revert on failure
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <button 
                onClick={() => router.push('/dashboard/racks')}
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Racks
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-blue-500" />
                        {rack.name} Elevation
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Datacenter: {rack.row?.room?.datacenter?.name} | Room: {rack.row?.room?.name} | Row: {rack.row?.name}
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" /> Add Equipment
                </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg w-fit">
                <button 
                    onClick={() => setPerspective('FRONT')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${perspective === 'FRONT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ArrowRightLeft className="w-4 h-4" /> Front View
                </button>
                <button 
                    onClick={() => setPerspective('REAR')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${perspective === 'REAR' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ArrowRightLeft className="w-4 h-4" /> Rear View
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Rack Visualizer */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex justify-center">
                    <div className="w-full max-w-[280px] bg-slate-950 border-x-4 border-y-2 border-slate-700/50 rounded-sm p-2 flex flex-col gap-1 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)_inset]">
                        {uArray.map(u => {
                            const eq = getEquipmentAtU(u);
                            const isTop = eq && u === eq.uEnd;
                            const isMiddle = eq && u < eq.uEnd && u > eq.uStart;
                            let eqClasses = "bg-slate-900 border-slate-800";
                            
                            if (eq) {
                                eqClasses = "bg-blue-500/10 border-blue-500/30 text-blue-400";
                                if (eq.equipmentType === 'PATCH_PANEL') eqClasses = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                                if (eq.equipmentType === 'NETWORK') eqClasses = "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
                                
                                if (!isTop && !isMiddle) {
                                    // Bottom
                                    eqClasses += " rounded-b-md border-b border-x";
                                } else if (isTop) {
                                    // Top
                                    eqClasses += " rounded-t-md border-t border-x cursor-grab active:cursor-grabbing";
                                } else {
                                    // Middle
                                    eqClasses += " border-x";
                                }
                            }

                            return (
                                <div 
                                    key={u} 
                                    className="flex items-center gap-2"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, u)}
                                >
                                    <div className="w-6 text-right text-[10px] font-mono text-slate-500">{u}</div>
                                    <div 
                                        draggable={isTop} // Only drag by the top edge to move whole block
                                        onDragStart={(e) => eq && isTop ? handleDragStart(e, eq) : e.preventDefault()}
                                        className={`flex-1 h-6 flex items-center justify-center text-xs font-semibold overflow-hidden transition-all ${eq ? eqClasses : 'bg-slate-900/40 border border-slate-800/30 border-dashed rounded-sm text-slate-600 hover:border-slate-500/50 hover:bg-slate-800/40'}`}
                                    >
                                        {eq && isTop && (
                                            <span className="truncate px-2 flex items-center gap-1.5 pointer-events-none">
                                                {eq.equipmentType === 'SERVER' && <Server className="w-3 h-3" />}
                                                {eq.equipmentType === 'NETWORK' && <Activity className="w-3 h-3" />}
                                                {eq.name}
                                            </span>
                                        )}
                                        {!eq && <span className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer">Available (Drop Here)</span>}
                                    </div>
                                    <div className="w-6 text-left text-[10px] font-mono text-slate-500">{u}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Details & Logs */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Equipment Details */}
                    <h2 className="text-xl font-bold text-slate-200">Installed Equipment ({perspective})</h2>
                    <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                        {visibleEquipments.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">No equipment installed on this face.</div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {visibleEquipments.map((eq: any) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={eq.id} 
                                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-6 hover:border-slate-700 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-slate-200">{eq.name}</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-400">
                                                    {eq.equipmentType || 'UNKNOWN'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    U{eq.uStart} - U{eq.uEnd}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {eq.orientation || 'FRONT'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-3">
                                                <div className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Maker: {eq.maker || 'N/A'}</div>
                                                <div className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> Ports: {eq.ports?.length || 0} Total</div>
                                                <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> 
                                                    Available Ports: {eq.ports?.filter((p: any) => p.status === 'AVAILABLE').length || 0}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {eq.ports && eq.ports.length > 0 && (
                                            <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                                <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Port Status Grid</h4>
                                                <div className="grid grid-cols-8 gap-1.5">
                                                    {eq.ports.map((port: any) => {
                                                        const isAvail = port.status === 'AVAILABLE';
                                                        const inUse = port.status === 'IN_USE';
                                                        const isDefective = port.status === 'DEFECTIVE';
                                                        
                                                        let portColor = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";
                                                        if (inUse) portColor = "bg-blue-500/20 border-blue-500/40 text-blue-400";
                                                        if (isDefective) portColor = "bg-red-500/20 border-red-500/40 text-red-400";

                                                        return (
                                                            <div 
                                                                key={port.id} 
                                                                title={`Port ${port.portNumber} - ${port.status}`}
                                                                onClick={() => setSelectedEquipment(eq)}
                                                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${portColor} transition-all cursor-crosshair hover:scale-110`}
                                                            >
                                                                {port.portNumber}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Infrastructure Audit Timeline */}
                    <div className="mt-8 pt-8 border-t border-slate-800">
                        <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-400" /> Infrastructure Audit Trail
                        </h2>
                        
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            {auditLogs.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">No relocation records found for this rack.</p>
                            ) : (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                                    {auditLogs.map((log: any, idx: number) => {
                                        const prev = log.previousState ? JSON.parse(log.previousState) : null;
                                        const next = log.newState ? JSON.parse(log.newState) : null;

                                        return (
                                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                {/* Icon */}
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-slate-900 relative z-10">
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                </div>
                                                {/* Card */}
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 transition-colors shadow-lg shadow-black/20">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold text-purple-400 tracking-wider uppercase">{log.action}</span>
                                                        <span className="text-xs text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <h3 className="font-semibold text-slate-200 text-sm mb-2">{log.equipment?.name}</h3>
                                                    <div className="text-xs text-slate-400 space-y-1">
                                                        <p>User: <span className="text-slate-300 font-semibold">{log.user?.name || 'System / Missing'}</span></p>
                                                        {prev && next && (
                                                            <div className="flex items-center gap-2 mt-2 bg-slate-900 p-2 rounded-md border border-slate-800">
                                                                <div>
                                                                    <div className="text-[10px] text-slate-500">From</div>
                                                                    <div className="font-mono text-rose-400">U{prev.uStart}-U{prev.uEnd}</div>
                                                                </div>
                                                                <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                                                                <div>
                                                                    <div className="text-[10px] text-slate-500">To</div>
                                                                    <div className="font-mono text-emerald-400">U{next.uStart}-U{next.uEnd}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Equipment Port Detail Modal */}
            <AnimatePresence>
                {selectedEquipment && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-slate-800">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">{selectedEquipment.name}</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Detailed port layout and cross-connect mapping.</p>
                                </div>
                                <button onClick={() => setSelectedEquipment(null)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                                    {selectedEquipment.ports?.map((port: any) => {
                                        const isAvail = port.status === 'AVAILABLE';
                                        const inUse = port.status === 'IN_USE';
                                        const isDefective = port.status === 'DEFECTIVE';
                                        
                                        let portColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
                                        if (inUse) portColor = "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20";
                                        if (isDefective) portColor = "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20";

                                        return (
                                            <div 
                                                key={port.id} 
                                                className={`p-3 rounded-xl border ${portColor} flex flex-col items-center justify-center gap-2 group relative`}
                                            >
                                                <span className="text-xs font-bold font-mono">P{port.portNumber}</span>
                                                <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_10px_currentColor] opacity-70"></div>
                                                
                                                {/* Tooltip */}
                                                <div className="absolute inset-0 bg-slate-900 border border-slate-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 pointer-events-none p-2 text-center shadow-xl">
                                                    <span className="text-[10px] font-bold text-slate-300">{port.status}</span>
                                                    {port.mediaType && <span className="text-[9px] text-slate-400 mt-1">{port.mediaType}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end">
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">
                                    <Network className="w-4 h-4" /> Manage Cross-Connects
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #334155;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
