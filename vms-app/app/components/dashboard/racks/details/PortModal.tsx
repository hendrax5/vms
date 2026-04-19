'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PortModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedEquipment: any;
    onBindPort?: (port: any) => void;
}

const PortModal: React.FC<PortModalProps> = ({ isOpen, onClose, selectedEquipment, onBindPort }) => {
    if (!isOpen || !selectedEquipment) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
            >
                <div className="p-8 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight">{selectedEquipment.name} Ports</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Interconnection Interface</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 max-h-[60vh] overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {selectedEquipment.ports?.map((port: any) => {
                        const isConnected = port.crossConnectA?.length > 0 || port.crossConnectZ?.length > 0 || port.crossConnectMmrA?.length > 0 || port.crossConnectMmrZ?.length > 0;
                        const connections = [...(port.crossConnectA || []), ...(port.crossConnectZ || []), ...(port.crossConnectMmrA || []), ...(port.crossConnectMmrZ || [])];
                        const activeConnection = connections.find(c => c.status !== 'Terminated');
                        
                        let connectionLabel = 'Available';
                        let statusColor = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400';
                        let dotColor = 'bg-emerald-500';

                        if (activeConnection) {
                            connectionLabel = `CX-${activeConnection.id} (${activeConnection.status})`;
                            statusColor = activeConnection.status === 'Active' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400';
                            dotColor = activeConnection.status === 'Active' ? 'bg-blue-500' : 'bg-amber-500';
                        } else if (port.status !== 'AVAILABLE') {
                            connectionLabel = port.status;
                            statusColor = 'bg-rose-500/5 border-rose-500/20 text-rose-400';
                            dotColor = 'bg-rose-500';
                        }

                        return (
                            <div key={port.id} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 group relative ${statusColor}`}>
                                <span className="text-[10px] font-mono font-bold">P{port.portNumber}</span>
                                <div className={`w-2 h-2 rounded-full ${dotColor} shadow-[0_0_10px_currentColor]`}></div>
                                
                                {activeConnection ? (
                                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl z-50 text-left w-max min-w-[200px] pointer-events-none -top-full left-1/2 -translate-x-1/2 mt-2">
                                        <div className="text-[10px] text-white font-bold mb-1 border-b border-white/10 pb-1">Connection Details</div>
                                        <div className="text-[10px] text-slate-400 mb-1">CX ID: <span className="text-white">CX-{activeConnection.id}</span></div>
                                        <div className="text-[10px] text-slate-400 mb-1">Status: <span className="text-white">{activeConnection.status}</span></div>
                                        {activeConnection.customer && <div className="text-[10px] text-slate-400 mb-1">Tenant: <span className="text-white">{activeConnection.customer.name}</span></div>}
                                        {activeConnection.targetProvider && <div className="text-[10px] text-slate-400">Target: <span className="text-white">{activeConnection.targetProvider}</span></div>}
                                    </div>
                                ) : (
                                    !activeConnection && port.status === 'AVAILABLE' && onBindPort && (
                                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto -top-10 left-1/2 -translate-x-1/2">
                                            <button 
                                                onClick={() => {
                                                    onClose();
                                                    onBindPort(port);
                                                }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg whitespace-nowrap transition-colors"
                                            >
                                                Bind Port
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};

export default PortModal;
