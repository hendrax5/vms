'use client';

import React from 'react';
import { Server } from 'lucide-react';

interface RackElevationProps {
    totalU: number;
    uArray: number[];
    getEquipmentAtU: (u: number) => any;
    canEdit: boolean;
    handleDragStart: (e: React.DragEvent, eq: any) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, targetU: number) => void;
}

const RackElevation: React.FC<RackElevationProps> = ({ 
    totalU, uArray, getEquipmentAtU, canEdit, handleDragStart, handleDragOver, handleDrop 
}) => {
    return (
        <div className="lg:col-span-1 bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl flex flex-col items-center">
            
            {/* Rack Header Info */}
            <div className="w-full max-w-[280px] flex items-center justify-between mb-6">
                 <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                     <h3 className="font-bold text-slate-100 uppercase tracking-[0.15em] text-sm">Elevation</h3>
                 </div>
            </div>

            <div className="w-full max-w-[280px] bg-slate-950 border-[6px] border-slate-800 rounded-xl p-1 shadow-2xl relative">
                 {/* Vent Top */}
                 <div className="border border-slate-700 w-full mb-3 h-6 bg-slate-900 rounded-sm flex items-center justify-center overflow-hidden">
                    <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-6 h-0.5 bg-slate-800"></div>
                        ))}
                    </div>
                </div>

                <div className="bg-black border border-slate-900 rounded-sm overflow-hidden flex flex-col">
                    {uArray.map(u => {
                        const eq = getEquipmentAtU(u);
                        
                        if (eq) {
                            if (u === eq.uEnd) {
                                const heightU = eq.uEnd - eq.uStart + 1;
                                const isMine = eq.isMine;

                                return (
                                    <div 
                                        key={`u-${u}-eq-${eq.id}`} 
                                        style={{ height: `${heightU * 32}px` }} 
                                        draggable={canEdit && isMine}
                                        onDragStart={(e) => (canEdit && isMine) ? handleDragStart(e, eq) : e.preventDefault()}
                                        className={`border-b border-l border-r border-slate-700 relative overflow-hidden group transition-all ${
                                            (canEdit && isMine) ? 'cursor-move hover:brightness-110' : 'cursor-not-allowed opacity-90'
                                        } ${isMine ? 'bg-emerald-900/40' : 'bg-slate-800'}`}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900 border-r border-slate-700 flex flex-col items-center justify-between py-1 text-[10px] text-slate-500 font-mono">
                                            <span>{eq.uEnd}</span>
                                            {heightU > 1 && <span>{eq.uStart}</span>}
                                        </div>
                                        <div className="ml-8 p-3 w-full h-full flex justify-between items-center bg-gradient-to-r from-emerald-900/20 to-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${isMine ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    <Server className="w-3 h-3" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-200 line-clamp-1">{eq.name}</p>
                                                    <p className="text-[10px] text-emerald-500/80 font-mono tracking-tighter uppercase">{eq.equipmentType || 'EQUIPMENT'} • {heightU}U</p>
                                                </div>
                                            </div>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isMine ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-slate-600'}`}></div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        } else {
                            // Empty Space
                            return (
                                <div 
                                    key={`u-${u}-empty`} 
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, u)}
                                    style={{ height: '32px' }} 
                                    className={`border-b border-l border-r border-slate-800/50 bg-slate-950/40 flex items-center group transition-colors ${canEdit ? 'hover:bg-emerald-950/20 hover:border-emerald-800/50' : ''}`}
                                >
                                    <div className="w-8 h-full bg-slate-900/50 border-r border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                                        {u}
                                    </div>
                                    {canEdit && (
                                        <div className="ml-4 text-[9px] font-bold font-mono text-slate-700 uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                                            Drag to position
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>

                {/* Rack Bottom Feet */}
                <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-4">
                    <div className="w-8 h-2 bg-slate-800 rounded-b-lg"></div>
                    <div className="w-8 h-2 bg-slate-800 rounded-b-lg"></div>
                </div>
            </div>

            {/* Perspective Legend */}
            <div className="mt-10 flex gap-6 w-full max-w-[280px] justify-center">
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-emerald-900/40 border border-emerald-500/30 rounded"></div>
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Assets</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded"></div>
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shared/Other</span>
                 </div>
            </div>
        </div>
    );
};

export default RackElevation;
