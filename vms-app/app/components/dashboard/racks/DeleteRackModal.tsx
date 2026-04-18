'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DeleteRackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteRackModal: React.FC<DeleteRackModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-rose-500/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center"
            >
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Delete Rack?</h3>
                <p className="text-sm text-slate-400 mb-6">This action cannot be undone. All equipment mapped to this rack will be permanently deleted via Cascade.</p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default DeleteRackModal;
