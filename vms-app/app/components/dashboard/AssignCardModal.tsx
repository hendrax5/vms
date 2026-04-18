'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface AssignCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (permitId: number, cardId: string) => void;
    targetPermit: any;
    accessCards: any[];
}

const AssignCardModal: React.FC<AssignCardModalProps> = ({ 
    isOpen, onClose, onSubmit, targetPermit, accessCards 
}) => {
    const [selectedCardId, setSelectedCardId] = useState('');

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (targetPermit && selectedCardId) {
            onSubmit(targetPermit.id, selectedCardId);
            setSelectedCardId('');
        }
    };

    if (!isOpen || !targetPermit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-semibold text-slate-100">Assign Access Card</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-slate-400">
                        Ensure that the Visitor <strong className="text-white">{targetPermit.visitorNames}</strong> has handed over their Physical KTP/ID Document before issuing an access card.
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Available Access Cards</label>
                        <select 
                            required
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="">- Scan or Select Available Card -</option>
                            {accessCards.filter(c => c.status === 'Available').map(card => (
                                <option key={card.id} value={card.id}>{card.cardNumber}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full mt-4 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg"
                    >
                        Confirm Assignment
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default AssignCardModal;
