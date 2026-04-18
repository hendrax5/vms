'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface AddRackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    rows: any[];
    saving: boolean;
}

const AddRackModal: React.FC<AddRackModalProps> = ({ isOpen, onClose, onSubmit, rows, saving }) => {
    const [formData, setFormData] = useState({ name: '', rowId: '', uCapacity: 42 });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ name: '', rowId: '', uCapacity: 42 });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-slate-100">Add New Rack</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Row Selection</label>
                        <select 
                            required
                            value={formData.rowId}
                            onChange={e => setFormData({...formData, rowId: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value="" disabled>Select a row...</option>
                            {rows.map(r => (
                                <option key={r.id} value={r.id}>{r.room?.datacenter?.code} - {r.room?.name} - {r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Rack Name / Identifier</label>
                        <input 
                            required
                            type="text"
                            placeholder="e.g. RK-A-01"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">U Space Capacity</label>
                        <input 
                            required
                            type="number"
                            min="1"
                            max="60"
                            value={formData.uCapacity}
                            onChange={e => setFormData({...formData, uCapacity: parseInt(e.target.value)})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                         <button 
                             type="submit" 
                             disabled={saving || rows.length === 0}
                             className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                         >
                             {saving ? 'Creating...' : 'Create Rack'}
                         </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AddRackModal;
