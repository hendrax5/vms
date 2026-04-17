'use client';

import { useState, useEffect } from 'react';
import { Server, Database, Activity, Wifi, Box, RotateCw, Eye, ArrowRightLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantColocation({ equipments, onRefresh }: { equipments: any[], onRefresh?: () => void }) {
    const { data: session } = useSession();
    
    // Perspective state: FRONT, BACK, or BOTH (X-ray)
    const [perspective, setPerspective] = useState<'FRONT' | 'BACK' | 'BOTH'>('FRONT');
    const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
    const [draggedEq, setDraggedEq] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    // RBAC Context
    const rawRole = (session?.user as any)?.role;
    const roleName = typeof rawRole === 'object' ? rawRole?.name : rawRole;
    const userRole = (roleName || '').toLowerCase().replace(/\s+/g, '') || '';
    const userCustomerId = (session?.user as any)?.customerId || null;
    const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
    const isTenantAdmin = ['tenantadmin', 'tenantstaff', 'customer'].includes(userRole);

    // Determine unique racks from the equipments
    const racksMap = new Map();
    equipments.forEach(eq => {
        if (!racksMap.has(eq.rackId)) {
            racksMap.set(eq.rackId, { 
                id: eq.rackId, 
                name: eq.rack?.name || `Rack ID-${eq.rackId}`, 
                capacity: eq.rack?.uCapacity || 42,
                customerId: eq.rack?.customerId,
                equipments: [] 
            });
        }
        racksMap.get(eq.rackId).equipments.push(eq);
    });

    const racks = Array.from(racksMap.values());
    
    // Auto-select first rack if none selected
    useEffect(() => {
        if (!selectedRackId && racks.length > 0) {
            setSelectedRackId(racks[0].id);
        }
    }, [racks, selectedRackId]);

    const activeRack = racks.find(r => r.id === selectedRackId);

    // Permission check for the active rack
    const canEditRack = isInternalAdmin || (isTenantAdmin && (activeRack?.customerId === null || (userCustomerId !== null && Number(activeRack?.customerId) === Number(userCustomerId))));

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, eq: any) => {
        if (!canEditRack) return;
        setDraggedEq(eq);
        e.dataTransfer.setData('equipmentId', eq.id.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetU: number) => {
        e.preventDefault();
        if (!draggedEq || !canEditRack) return;

        // Dynamic equipment-level check for Tenant Admins in shared racks
        if (!isInternalAdmin && isTenantAdmin) {
            const ownsRack = userCustomerId !== null && Number(activeRack?.customerId) === Number(userCustomerId);
            const ownsEq = userCustomerId !== null && (Number(draggedEq.customerId) === Number(userCustomerId) || (draggedEq.customerId === null && draggedEq.equipmentType !== 'PATCH_PANEL'));
            if (!ownsRack && !ownsEq) {
                alert("You do not have permission to move this specific equipment.");
                setDraggedEq(null);
                return;
            }
        }

        // Coordinate calculation: targetU is the TOP coordinate (newUEnd)
        const size = draggedEq.uEnd - draggedEq.uStart + 1;
        const newUEnd = targetU;
        const newUStart = targetU - size + 1;

        if (newUStart < 1) {
            alert("Insufficient U-Space at the bottom.");
            setDraggedEq(null);
            return;
        }

        // Collision Check
        const collision = activeRack?.equipments.find((eq: any) => {
            if (eq.id === draggedEq.id) return false;
            return Math.max(eq.uStart, newUStart) <= Math.min(eq.uEnd, newUEnd);
        });

        if (collision) {
            alert(`U-Space Collision with '${collision.name}'`);
            setDraggedEq(null);
            return;
        }

        // Perform API Update
        setUpdating(true);
        try {
            const res = await fetch(`/api/racks/equipments/${draggedEq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uStart: newUStart,
                    uEnd: newUEnd,
                    rackId: activeRack?.id
                })
            });

            if (res.ok) {
                if (onRefresh) onRefresh();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update position.");
            }
        } catch (error) {
            console.error("Drop error:", error);
        } finally {
            setUpdating(false);
            setDraggedEq(null);
        }
    };

    // --- Render Helpers ---
    const renderRackU = () => {
        if (!activeRack) return null;
        let layout = [];
        const capacity = activeRack.capacity || 42;
        
        for (let u = capacity; u >= 1; u--) {
            // Find equipment at this U
            const eq = activeRack.equipments.find((e: any) => {
                const posMatch = u >= e.uStart && u <= e.uEnd;
                if (!posMatch) return false;

                // Perspective filtering
                if (perspective === 'FRONT') return e.orientation === 'FRONT' || !e.orientation;
                if (perspective === 'BACK') return e.orientation === 'BACK';
                return true; // BOTH
            });
            
            if (eq) {
                if (u === eq.uEnd) {
                    const heightU = eq.uEnd - eq.uStart + 1;
                    const canMoveThis = isInternalAdmin || (isTenantAdmin && (eq.customerId === Number(userCustomerId) || (eq.customerId === null && eq.equipmentType !== 'PATCH_PANEL')));
                    
                    layout.push(
                        <motion.div 
                            key={`u-${u}-eq-${eq.id}`} 
                            layoutId={`eq-${eq.id}`}
                            style={{ height: `${heightU * 32}px` }} 
                            draggable={canMoveThis && !updating}
                            onDragStart={(e) => handleDragStart(e as any, eq)}
                            className={`border-b border-l border-r border-slate-700 relative overflow-hidden group transition-all cursor-move
                                ${canMoveThis ? 'hover:brightness-110' : 'cursor-not-allowed opacity-90'}
                                ${eq.customerId === null ? 'bg-slate-800' : 'bg-emerald-900/40'}
                            `}
                        >
                           <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900 border-r border-slate-700 flex flex-col items-center justify-between py-1 text-[10px] text-slate-500 font-mono">
                               <span>{eq.uEnd}</span>
                               {heightU > 1 && <span>{eq.uStart}</span>}
                           </div>
                           <div className="ml-8 p-3 w-full h-full flex justify-between items-center bg-gradient-to-r from-emerald-900/20 to-transparent">
                               <div className="flex items-center gap-3">
                                   <div className={`p-1.5 rounded-lg ${eq.customerId === null ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
                                       <Server className="w-3 h-3" />
                                   </div>
                                   <div>
                                       <p className="text-xs font-bold text-slate-200 line-clamp-1">{eq.name}</p>
                                       <p className="text-[10px] text-emerald-500/80 font-mono tracking-tighter uppercase">{eq.equipmentType} • {heightU}U</p>
                                   </div>
                               </div>
                               <div className={`w-1.5 h-1.5 rounded-full ${eq.customerId === null ? 'bg-slate-600' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'}`}></div>
                           </div>
                        </motion.div>
                    );
                }
            } else {
                // Empty Space
                layout.push(
                    <div 
                        key={`u-${u}-empty`} 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e as any, u)}
                        style={{ height: '32px' }} 
                        className={`border-b border-l border-r border-slate-800/50 bg-slate-950/40 flex items-center group transition-colors
                            ${canEditRack ? 'hover:bg-emerald-950/20 hover:border-emerald-800/50' : ''}
                        `}
                    >
                        <div className="w-8 h-full bg-slate-900/50 border-r border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                            {u}
                        </div>
                        {canEditRack && (
                            <div className="ml-4 text-[9px] font-bold font-mono text-slate-700 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                                Drag to position
                            </div>
                        )}
                    </div>
                );
            }
        }
        return layout;
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/40 border border-white/10 p-6 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl gap-4">
                <div>
                    <h3 className="font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" />
                        Rack Management
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tight">Enterprise Infrastructure Visualization</p>
                </div>
                
                <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/10">
                    {[
                        { id: 'FRONT', label: 'Front', icon: Eye },
                        { id: 'BACK', label: 'Rear', icon: RotateCw },
                        { id: 'BOTH', label: 'X-Ray', icon: ArrowRightLeft }
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPerspective(p.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all
                                ${perspective === p.id 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}
                            `}
                        >
                            <p.icon className="w-3.5 h-3.5" />
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {racks.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] p-12 text-center rounded-3xl backdrop-blur-2xl">
                    <Box className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                    <h4 className="text-slate-400 font-bold uppercase tracking-widest mb-2">No Active Cabinets</h4>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Contact support to provision your colocation space.</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Panel: Inventory */}
                    <div className="w-full lg:w-1/3 space-y-4">
                        <div className="bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Deployed Fleet</h4>
                            </div>
                            <div className="p-2 space-y-1">
                                {racks.map(rack => (
                                    <button 
                                        key={rack.id} 
                                        onClick={() => setSelectedRackId(rack.id)}
                                        className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex justify-between items-center group
                                            ${selectedRackId === rack.id 
                                                ? 'bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 shadow-lg' 
                                                : 'bg-transparent border border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-200'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${selectedRackId === rack.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                                                <Database className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-tight">{rack.name}</p>
                                                <p className="text-[10px] opacity-60 font-mono">{rack.capacity}U Configuration</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${selectedRackId === rack.id ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                                            {rack.equipments.length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeRack && (
                            <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Cabinet Metadata</h4>
                                <div className="space-y-4 font-mono text-[10px]">
                                     <div className="flex justify-between border-b border-slate-800/50 pb-3">
                                         <span className="text-slate-500 uppercase">Status</span>
                                         <span className="text-emerald-400 font-bold uppercase">Provisioned</span>
                                     </div>
                                     <div className="flex justify-between border-b border-slate-800/50 pb-3">
                                         <span className="text-slate-500 uppercase">Ownership</span>
                                         <span className="text-slate-200 uppercase">{activeRack.customerId ? 'Private' : 'Shared Colocation'}</span>
                                     </div>
                                     <div className="flex justify-between border-b border-slate-800/50 pb-3">
                                         <span className="text-slate-500 uppercase">Telemetry</span>
                                         <span className="text-emerald-400 flex items-center gap-1 font-bold uppercase animate-pulse">
                                             <Activity className="w-3 h-3"/> Nominal
                                         </span>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Elevation */}
                    <div className="w-full lg:w-2/3 bg-slate-900/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl relative min-h-[800px]">
                         <AnimatePresence mode="wait">
                             <motion.div 
                                key={`${selectedRackId}-${perspective}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full max-w-sm flex flex-col items-center"
                             >
                                 {/* Rack Header Info */}
                                 <div className="w-full flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                          <h3 className="font-bold text-slate-100 uppercase tracking-[0.15em] text-sm">{perspective} Elevation</h3>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5">
                                          {activeRack?.name}
                                      </span>
                                 </div>
                                 
                                 {/* Industrial Rack Frame */}
                                 <div className="w-full bg-slate-950 border-[6px] border-slate-800 rounded-xl p-1 shadow-2xl relative">
                                      {/* Vent Top */}
                                      <div className="border border-slate-700 w-full mb-3 h-6 bg-slate-900 rounded-sm flex items-center justify-center overflow-hidden">
                                          <div className="flex gap-1">
                                              {[...Array(8)].map((_, i) => (
                                                  <div key={i} className="w-6 h-0.5 bg-slate-800"></div>
                                              ))}
                                          </div>
                                      </div>
                                      
                                      <div className="bg-black border border-slate-900 rounded-sm overflow-hidden">
                                           {renderRackU()}
                                      </div>

                                      {/* Rack Bottom Feet */}
                                      <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-4">
                                          <div className="w-8 h-2 bg-slate-800 rounded-b-lg"></div>
                                          <div className="w-8 h-2 bg-slate-800 rounded-b-lg"></div>
                                      </div>
                                 </div>

                                 {/* Perspective Legend */}
                                 <div className="mt-10 flex gap-6">
                                      <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 bg-emerald-900/40 border border-emerald-500/30 rounded"></div>
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Assets</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded"></div>
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Facility/Shared</span>
                                      </div>
                                 </div>
                             </motion.div>
                         </AnimatePresence>

                         {updating && (
                             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-3xl">
                                 <div className="flex flex-col items-center">
                                     <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                                     <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Updating Infrastructure</p>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
}
