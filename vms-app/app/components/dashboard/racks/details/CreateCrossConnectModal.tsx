'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateCrossConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceEquipment: any;
    sourcePort: any;
    onSuccess: () => void;
}

const CreateCrossConnectModal: React.FC<CreateCrossConnectModalProps> = ({ isOpen, onClose, sourceEquipment, sourcePort, onSuccess }) => {
    const [targetEquipments, setTargetEquipments] = useState<any[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState<number | ''>('');
    const [selectedTargetPortId, setSelectedTargetPortId] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && sourceEquipment?.rackId) {
            fetchTargetEquipments();
        }
    }, [isOpen, sourceEquipment]);

    const fetchTargetEquipments = async () => {
        setLoading(true);
        try {
            // Fetch all equipments, optionally filtered by type if needed
            // For now, let's fetch all PATCH_PANEL / OTB in the system
            const res = await fetch(`/api/racks/equipments?equipmentType=PATCH_PANEL`);
            if (res.ok) {
                const data = await res.json();
                setTargetEquipments(data.filter((eq: any) => eq.id !== sourceEquipment.id));
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleBind = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTargetPortId) return toast.error('Please select a target port');
        setSaving(true);
        try {
            const payload = {
                datacenterId: sourceEquipment.rack?.row?.room?.datacenterId || 1, // Fallback if missing
                customerId: sourceEquipment.customerId,
                mediaType: 'Singlemode Fiber',
                sideAPortId: sourcePort.id,
                sideZPortId: selectedTargetPortId,
                status: 'Active'
            };
            const res = await fetch('/api/cross-connects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success('Cross-Connect created successfully!');
                onSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create Cross-Connect');
            }
        } catch (error) {
            toast.error('An error occurred.');
        }
        setSaving(false);
    };

    const selectedTarget = targetEquipments.find(eq => eq.id === selectedTargetId);
    const filteredEquipments = targetEquipments.filter(eq => eq.name.toLowerCase().includes(searchQuery.toLowerCase()) || eq.rack?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!isOpen || !sourceEquipment || !sourcePort) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Bind Port</h2>
                        <p className="text-xs text-emerald-400 mt-1 font-mono uppercase tracking-widest">{sourceEquipment.name} : Port {sourcePort.portNumber}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleBind} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Select Target OTB / Patch Panel</label>
                            <div className="relative mb-3">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="text" 
                                    placeholder="Search OTB..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950">
                                {loading ? (
                                    <div className="p-4 text-center text-sm text-slate-500">Loading OTBs...</div>
                                ) : filteredEquipments.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-slate-500">No OTBs found</div>
                                ) : (
                                    filteredEquipments.map(eq => (
                                        <div 
                                            key={eq.id} 
                                            onClick={() => { setSelectedTargetId(eq.id); setSelectedTargetPortId(''); }}
                                            className={`p-3 border-b border-slate-800/50 cursor-pointer flex justify-between items-center transition-colors ${selectedTargetId === eq.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'hover:bg-slate-800/50'}`}
                                        >
                                            <div>
                                                <div className={`font-medium ${selectedTargetId === eq.id ? 'text-emerald-400' : 'text-slate-300'}`}>{eq.name}</div>
                                                <div className="text-[10px] text-slate-500">Rack: {eq.rack?.name} | Row: {eq.rack?.row?.name}</div>
                                            </div>
                                            {selectedTargetId === eq.id && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_theme('colors.emerald.500')]"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {selectedTarget && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Select Target Port on {selectedTarget.name}</label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                    {selectedTarget.ports?.map((port: any) => {
                                        const isAvailable = port.status === 'AVAILABLE';
                                        return (
                                            <button
                                                key={port.id}
                                                type="button"
                                                disabled={!isAvailable}
                                                onClick={() => setSelectedTargetPortId(port.id)}
                                                className={`p-2 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                                                    selectedTargetPortId === port.id 
                                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_theme("colors.emerald.500/20")]' 
                                                        : isAvailable
                                                            ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'
                                                            : 'bg-rose-500/5 border-rose-500/10 text-rose-500/50 cursor-not-allowed'
                                                }`}
                                            >
                                                P{port.portNumber}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-800 shrink-0 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                         <button 
                             type="submit" 
                             disabled={saving || !selectedTargetPortId}
                             className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                         >
                             {saving ? 'Binding...' : 'Bind Connection'}
                         </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateCrossConnectModal;
