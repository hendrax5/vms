'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: any;
    perspective: string;
}

const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, onSubmit, initialData, perspective }) => {
    const [formData, setFormData] = useState({ id: null, name: '', equipmentType: 'SERVER', uStart: 1, uEnd: 1, orientation: 'FRONT', status: 'Active' });

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id || null,
                name: initialData.name || '',
                equipmentType: initialData.equipmentType || 'SERVER',
                uStart: initialData.uStart || 1,
                uEnd: initialData.uEnd || 1,
                orientation: initialData.orientation || (perspective === 'BOTH' ? 'FRONT' : perspective),
                status: initialData.status || 'Active'
            });
        }
    }, [initialData, perspective]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl">
                <div className="p-8 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-extrabold text-white uppercase tracking-widest">{formData.id ? 'Modify Device' : 'Device Provisioning'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="p-8 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Hardware Label</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                            <select value={formData.equipmentType} onChange={e => setFormData({...formData, equipmentType: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                <option value="SERVER">SERVER</option>
                                <option value="SWITCH">SWITCH</option>
                                <option value="ROUTER">ROUTER</option>
                                <option value="PATCH_PANEL">PATCH_PANEL</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Side</label>
                            <select value={formData.orientation} onChange={e => setFormData({...formData, orientation: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                <option value="FRONT">FRONT</option>
                                <option value="BACK">REAR</option>
                                <option value="BOTH">BOTH</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-Start</label>
                            <input type="number" value={formData.uStart} onChange={e => setFormData({...formData, uStart: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-End</label>
                            <input type="number" value={formData.uEnd} onChange={e => setFormData({...formData, uEnd: parseInt(e.target.value)})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Operational Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Decommissioned">Decommissioned</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/20 transition-all mt-6">Commit Configuration</button>
                </form>
            </motion.div>
        </div>
    );
};

export default DeviceModal;
