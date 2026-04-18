'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface CreatePermitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    datacenters: any[];
    customers: any[];
    isInternalAdmin: boolean;
}

const CreatePermitModal: React.FC<CreatePermitModalProps> = ({ 
    isOpen, onClose, onSubmit, datacenters, customers, isInternalAdmin 
}) => {
    const [formData, setFormData] = useState({
        datacenterId: '',
        customerId: '',
        companyName: '',
        visitorNames: '',
        activity: '',
        scheduledAt: ''
    });

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ datacenterId: '', customerId: '', companyName: '', visitorNames: '', activity: '', scheduledAt: '' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-semibold text-slate-100">Create Visit Permit</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Datacenter</label>
                        <select 
                            required
                            value={formData.datacenterId}
                            onChange={(e) => setFormData({...formData, datacenterId: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select a datacenter...</option>
                            {datacenters.map(dc => (
                                <option key={dc.id} value={dc.id}>{dc.name}</option>
                            ))}
                        </select>
                    </div>
                    {isInternalAdmin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Customer (Tenant)</label>
                                <select 
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({...formData, customerId: e.target.value, companyName: ''})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">- Internal / Specify -</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Or Specific Company</label>
                                <input 
                                    type="text"
                                    disabled={!!formData.customerId}
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Visitor Names</label>
                        <input 
                            type="text"
                            required
                            value={formData.visitorNames}
                            onChange={(e) => setFormData({...formData, visitorNames: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="John Doe, Jane Smith"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Activity</label>
                        <input 
                            type="text"
                            required
                            value={formData.activity}
                            onChange={(e) => setFormData({...formData, activity: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Server Maintenance"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Scheduled Date</label>
                        <input 
                            type="date"
                            required
                            value={formData.scheduledAt}
                            onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                            Create Permit
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreatePermitModal;
