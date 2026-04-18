'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PortModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedEquipment: any;
}

const PortModal: React.FC<PortModalProps> = ({ isOpen, onClose, selectedEquipment }) => {
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
    );
};

export default PortModal;
