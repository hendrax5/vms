import { Building2, Layers, Server, Box, MapPin, X, Pencil, Trash2, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AssetContextPanelProps {
    isOpen: boolean;
    asset: { type: string; data: any } | null;
    onClose: () => void;
    onEdit: (type: string, data: any) => void;
    onDelete: (type: string, id: number, name: string) => void;
    onAddChild?: (parentType: string, parentData: any) => void;
    canEdit: boolean;
}

export default function AssetContextPanel({ isOpen, asset, onClose, onEdit, onDelete, onAddChild, canEdit }: AssetContextPanelProps) {
    if (!asset) return null;

    const getIcon = (type: string) => {
        switch(type) {
            case 'datacenter': return <Building2 className="w-8 h-8 text-emerald-400" />;
            case 'room': return <Layers className="w-8 h-8 text-blue-400" />;
            case 'row': return <MapPin className="w-8 h-8 text-amber-400" />;
            case 'rack': return <Box className="w-8 h-8 text-purple-400" />;
            case 'equipment': return <Server className="w-8 h-8 text-rose-400" />;
            default: return <Server className="w-8 h-8" />;
        }
    };

    const getChildType = (type: string) => {
        switch(type) {
            case 'datacenter': return 'room';
            case 'room': return 'row';
            case 'row': return 'rack';
            case 'rack': return 'equipment';
            default: return null;
        }
    };

    const childType = getChildType(asset.type);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-[400px] bg-slate-900/90 backdrop-blur-xl border-l border-white/10 z-[70] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-slate-950/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                                    {getIcon(asset.type)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">{asset.data.name}</h2>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2 mt-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        {asset.type}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Properties */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Properties</h3>
                                <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">ID</span>
                                        <span className="text-sm font-mono text-emerald-400">#{asset.data.id}</span>
                                    </div>
                                    {asset.data.code && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Code</span>
                                            <span className="text-sm font-medium text-slate-200">{asset.data.code}</span>
                                        </div>
                                    )}
                                    {asset.data.uCapacity && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">U-Capacity</span>
                                            <span className="text-sm font-medium text-slate-200">{asset.data.uCapacity}U</span>
                                        </div>
                                    )}
                                    {asset.data.status && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Status</span>
                                            <span className="text-sm font-medium text-slate-200">{asset.data.status}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Relationship Info */}
                            {asset.type === 'rack' && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Capacity</h3>
                                    <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-2">
                                                    <span className="text-slate-400">Used Space</span>
                                                    <span className="text-emerald-400 font-bold">{asset.data.equipments?.reduce((acc: number, eq: any) => acc + (eq.uEnd - eq.uStart + 1), 0) || 0}U / {asset.data.uCapacity}U</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${((asset.data.equipments?.reduce((acc: number, eq: any) => acc + (eq.uEnd - eq.uStart + 1), 0) || 0) / asset.data.uCapacity) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Actions Footer */}
                        {canEdit && (
                            <div className="p-6 bg-slate-950/80 border-t border-white/5 space-y-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Management Actions</h3>
                                
                                {childType && onAddChild && (
                                    <button onClick={() => onAddChild(asset.type, asset.data)} className="w-full flex items-center justify-between p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded-xl text-emerald-400 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Plus className="w-4 h-4" />
                                            <span className="text-sm font-bold">Add New {childType}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                    </button>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onEdit(asset.type, asset.data)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all text-sm font-bold">
                                        <Pencil className="w-4 h-4" /> Edit
                                    </button>
                                    <button onClick={() => onDelete(asset.type, asset.data.id, asset.data.name)} className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all text-sm font-bold">
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
