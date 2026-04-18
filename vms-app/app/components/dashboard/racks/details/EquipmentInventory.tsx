'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Edit2, Trash2 } from 'lucide-react';

interface EquipmentInventoryProps {
    visibleEquipments: any[];
    canEdit: boolean;
    onEdit: (eq: any) => void;
    onDelete: (id: number) => void;
    onSelectPorts: (eq: any) => void;
    userCustomerId: number | null;
}

const EquipmentInventory: React.FC<EquipmentInventoryProps> = ({ 
    visibleEquipments, canEdit, onEdit, onDelete, onSelectPorts, userCustomerId 
}) => {
    return (
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
                        const isMine = eq.isMine;
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
                                            <button onClick={() => onEdit(eq)} className="p-2 bg-white/5 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors text-slate-400">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => onDelete(eq.id)} className="p-2 bg-white/5 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-slate-400">
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
                                                onClick={() => onSelectPorts(eq)}
                                                className={`aspect-square rounded-sm border flex items-center justify-center text-[8px] font-bold cursor-pointer transition-transform hover:scale-125
                                                    ${port.status === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'}
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
    );
};

export default EquipmentInventory;
