'use client';

import { ArrowLeft, Server, Plus, Info, LayoutTemplate, Activity, X, Network, Share2, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RackElevationPage() {
    const params = useParams();
    const router = useRouter();
    const rackId = params.id as string;

    const [rack, setRack] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

    useEffect(() => {
        fetchRackDetails();
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

    if (loading) {
        return <div className="text-center text-slate-400 py-12">Loading Rack Elevation...</div>;
    }

    if (!rack) {
        return <div className="text-center text-red-400 py-12">Failed to load rack data.</div>;
    }

    // Logic to render U spaces from top (e.g. 42) down to 1
    const totalU = rack.uCapacity || 42;
    const uArray = Array.from({ length: totalU }, (_, i) => totalU - i);

    // Map gears
    const equipments = rack.equipments || [];

    // Helper to check if a specific U is occupied
    const getEquipmentAtU = (u: number) => {
        return equipments.find((eq: any) => u >= eq.uStart && u <= eq.uEnd);
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
                                    eqClasses += " rounded-t-md border-t border-x";
                                } else {
                                    // Middle
                                    eqClasses += " border-x";
                                }
                            }

                            return (
                                <div key={u} className="flex items-center gap-2">
                                    <div className="w-6 text-right text-[10px] font-mono text-slate-500">{u}</div>
                                    <div className={`flex-1 h-6 flex items-center justify-center text-xs font-semibold overflow-hidden ${eq ? eqClasses : 'bg-slate-900/40 border border-slate-800/30 border-dashed rounded-sm text-slate-600'}`}>
                                        {eq && isTop && (
                                            <span className="truncate px-2 flex items-center gap-1.5">
                                                {eq.equipmentType === 'SERVER' && <Server className="w-3 h-3" />}
                                                {eq.equipmentType === 'NETWORK' && <Activity className="w-3 h-3" />}
                                                {eq.name}
                                            </span>
                                        )}
                                        {!eq && <span className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer">Available</span>}
                                    </div>
                                    <div className="w-6 text-left text-[10px] font-mono text-slate-500">{u}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Equipment Details */}
                <div className="lg:col-span-3 space-y-6">
                    <h2 className="text-xl font-bold text-slate-200">Installed Equipment</h2>
                    <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                        {equipments.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">No equipment installed in this rack.</div>
                        ) : (
                            <div className="space-y-4">
                                {equipments.map((eq: any) => (
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
                </div>
            </div>

            {/* Equipment Port Detail Modal */}
            <AnimatePresence>
                {selectedEquipment && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                        <Network className="w-5 h-5 text-blue-500" />
                                        Port Map: {selectedEquipment.name}
                                    </h3>
                                    <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                                        {selectedEquipment.equipmentType} • Rack {rack.name} • U{selectedEquipment.uStart}-U{selectedEquipment.uEnd}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedEquipment(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-900 rounded-lg p-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(selectedEquipment.ports || []).map((port: any) => {
                                        // Analyze Connections
                                        const connectionA = port.crossConnectsAsSideA?.[0]; // This port is Side A
                                        const connectionZ = port.crossConnectsAsSideZ?.[0]; // This port is Side Z
                                        const connection = connectionA || connectionZ;

                                        let iconColor = "bg-emerald-500/20 text-emerald-400";
                                        let borderColor = "border-emerald-500/30";
                                        let statusText = "Available";
                                        
                                        if (port.status === 'IN_USE') {
                                            iconColor = "bg-blue-500/20 text-blue-400";
                                            borderColor = "border-blue-500/50";
                                            statusText = "In Use";
                                        } else if (port.status === 'DEFECTIVE') {
                                            iconColor = "bg-red-500/20 text-red-400";
                                            borderColor = "border-red-500/30";
                                            statusText = "Defective";
                                        }

                                        return (
                                            <div key={port.id} className={`flex items-start gap-4 p-4 rounded-xl border ${borderColor} bg-slate-900/50`}>
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border border-white/10 ${iconColor} shrink-0`}>
                                                    {port.portNumber}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm font-semibold text-slate-200">Port {port.portNumber}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${iconColor}`}>
                                                            {statusText}
                                                        </span>
                                                    </div>

                                                    {connection ? (
                                                        <div className="mt-3 text-xs border-t border-slate-800 pt-3 flex flex-col gap-2">
                                                            <div className="flex items-start gap-2 text-slate-300">
                                                                <Share2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                                                <div className="flex flex-col">
                                                                    <span className="text-slate-500 font-mono text-[10px] uppercase">Destination (Side Z)</span>
                                                                    {connection.targetProvider ? (
                                                                        <span className="font-semibold text-blue-400">
                                                                            Ext: {connection.targetProvider} 
                                                                            <span className="text-slate-500 text-[10px] ml-2">({connection.targetType})</span>
                                                                        </span>
                                                                    ) : connection.sideZPort ? (
                                                                        <span className="font-semibold text-blue-400">
                                                                            {connection.sideZPort?.equipment?.name} (Port {connection.sideZPort?.portNumber})
                                                                            <span className="text-slate-500 text-[10px] block">
                                                                                Cabinet {connection.sideZPort?.equipment?.rack?.name}
                                                                            </span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-500 italic">No Target Specified</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded">Media: {connection.mediaType}</span>
                                                                <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded">ID: XCON-{connection.id.toString().padStart(4, '0')}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-xs text-slate-500 italic">
                                                            {port.status === 'AVAILABLE' ? 'No active cross connects. Ready for patching.' : 'No cross connect data found.'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
