'use client';

import React from 'react';

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
                            eqClasses = eq.isMine ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-800/40 border-slate-700 text-slate-500";
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
    );
};

export default RackElevation;
