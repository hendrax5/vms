'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Camera, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PermitDetailModalProps {
    permit: any;
    onClose: () => void;
    onUpdateStatus: (id: number, status: string) => void;
    onAssignCard: (permit: any) => void;
    onReleaseCard: (cardId: string) => void;
    isInternalAdmin: boolean;
    assignedCard?: any;
}

const PermitDetailModal: React.FC<PermitDetailModalProps> = ({ 
    permit, onClose, onUpdateStatus, onAssignCard, onReleaseCard, isInternalAdmin, assignedCard 
}) => {
    if (!permit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-100">Review Permit PRM-{permit.id}</h2>
                        <p className="text-xs text-muted-foreground mt-1">Tenant: {permit.customer?.name || permit.companyName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                             <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Target Facility</p>
                             <p className="text-sm font-medium text-slate-200">{permit.datacenter?.name}</p>
                         </div>
                         <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                             <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Scheduled Date</p>
                             <p className="text-sm font-medium text-slate-200">{new Date(permit.scheduledAt).toLocaleDateString()}</p>
                         </div>
                    </div>
                    
                     <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                         <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Authorized Visitors</p>
                         <div className="flex flex-wrap gap-2">
                             {permit.visitorNames.split(',').map((name: string, i: number) => (
                                 <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 font-medium">
                                     {name.trim()}
                                 </span>
                             ))}
                         </div>
                    </div>

                    {permit.visitorPhoto && (
                        <div className="bg-slate-950 p-4 border border-indigo-500/30 rounded-lg">
                             <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-3 flex items-center gap-2">
                                 <Camera className="w-3 h-3" /> Kiosk Identity Verification Photos
                             </p>
                             <div className="grid grid-cols-2 gap-3">
                                 {(() => {
                                     try {
                                         const photos = JSON.parse(permit.visitorPhoto);
                                         return Object.entries(photos).map(([name, data]: [string, any], i) => (
                                             <div key={i} className="relative group">
                                                 <img 
                                                     src={data} 
                                                     alt={name} 
                                                     className="w-full h-32 object-cover rounded-lg border border-slate-800"
                                                 />
                                                 <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5 rounded-b-lg">
                                                     <p className="text-[9px] text-white font-bold truncate text-center">{name}</p>
                                                 </div>
                                             </div>
                                         ));
                                     } catch (e) {
                                         return <div className="col-span-2 p-4 text-center text-slate-500 italic text-xs">Failed to load biometric data</div>;
                                     }
                                 })()}
                             </div>
                        </div>
                    )}

                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                         <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Activity Description</p>
                         <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{permit.activity}</p>
                    </div>

                    <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg text-center">
                         <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Visitor Entry QR Code</p>
                         {permit.qrCodeToken ? (
                             <div className="bg-white p-4 rounded-xl inline-block mb-4">
                                 <QRCodeSVG value={permit.qrCodeToken} size={160} level="H" />
                             </div>
                         ) : (
                             <div className="py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                 <ShieldCheck className="w-12 h-12 text-slate-800 mx-auto mb-2 opacity-20" />
                                 <p className="text-xs text-slate-600 font-semibold italic">Token generated upon Approval</p>
                             </div>
                         )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                     <div>
                         <span className="text-xs font-semibold text-slate-500 uppercase mr-3">Status:</span>
                         <span className={`px-2 py-1 rounded text-xs font-bold ${permit.status === 'Pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-400'}`}>
                             {permit.status}
                         </span>
                     </div>
                     <div className="flex gap-3">
                         {isInternalAdmin && (
                             <>
                                 {permit.status === 'Pending' && (
                                     <>
                                         <button onClick={() => onUpdateStatus(permit.id, 'Rejected')} className="px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-lg text-sm font-semibold transition-colors">Reject</button>
                                         <button onClick={() => onUpdateStatus(permit.id, 'Approved')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20">Approve</button>
                                     </>
                                 )}
                                 {(permit.status === 'Approved' || permit.status === 'KioskVerified') && !assignedCard && (
                                      <button onClick={() => onAssignCard(permit)} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors">Assign Access Card</button>
                                 )}
                                 {assignedCard && (
                                      <button onClick={() => onReleaseCard(assignedCard.id)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">Release Card {assignedCard.cardNumber}</button>
                                 )}
                             </>
                         )}
                         <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors ml-4">Close</button>
                     </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PermitDetailModal;
