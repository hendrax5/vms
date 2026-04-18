'use client';

import { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Globe, Building2 } from 'lucide-react';

export default function InterconnectionProviders() {
    const [providers, setProviders] = useState<any[]>([]);
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: 'IXP', datacenterId: '' });
    const [isAdding, setIsAdding] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pRes, dcRes] = await Promise.all([
                fetch('/api/providers'),
                fetch('/api/datacenters')
            ]);
            if (pRes.ok) setProviders(await pRes.json());
            if (dcRes.ok) setDatacenters(await dcRes.json());
        } catch (error) {
            console.error('Failed to load connection data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const res = await fetch('/api/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setFormData({ name: '', type: 'IXP', datacenterId: '' });
                setIsAddOpen(false);
                loadData();
            }
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this provider?')) return;
        setProviders(providers.filter(p => p.id !== id));
        fetch(`/api/providers?id=${id}`, { method: 'DELETE' }).then(() => loadData());
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-xl mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Network className="w-5 h-5 text-emerald-400" /> External Service Providers
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                        Manage Cloud On-Ramps, IXPs, and Carriers that Tenants can select as Target (Z) when requesting Cross-Connects. 
                        Global targets apply to all datacenters.
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Target
                </button>
            </div>

            {isAddOpen && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Provider Name</label>
                                <input 
                                    required type="text"
                                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. APJII, AWS"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                                <select 
                                    required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="IXP">Public Peering / IXP</option>
                                    <option value="Carrier">Carrier / ISP</option>
                                    <option value="Cloud">Cloud On-Ramp</option>
                                    <option value="Custom">Other Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scope</label>
                                <select 
                                    value={formData.datacenterId} onChange={(e) => setFormData({...formData, datacenterId: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">Global (All Sites)</option>
                                    {datacenters.map(dc => (
                                        <option key={dc.id} value={dc.id}>{dc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" disabled={isAdding} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-sm font-bold rounded-lg transition-colors">{isAdding ? 'Adding...' : 'Save Provider'}</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.map(p => (
                        <div key={p.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl group relative overflow-hidden">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <span className="text-xs px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-400 font-bold uppercase tracking-wider mb-2 inline-block">
                                        {p.type}
                                    </span>
                                    <h3 className="text-lg font-black text-slate-200 uppercase">{p.name}</h3>
                                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 font-mono">
                                        {p.datacenterId ? (
                                             <><Building2 className="w-3 h-3 text-emerald-500"/> SITE SPECIFIC</>
                                        ) : (
                                             <><Globe className="w-3 h-3 text-emerald-500"/> GLOBAL TARGET</>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(p.id)} className="text-slate-600 hover:text-red-500 transition-colors p-2 bg-slate-950 rounded-lg group-hover:opacity-100 opacity-0 relative z-20">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && !isAddOpen && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                            <Network className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No external providers configured.</p>
                            <p className="text-slate-500 text-sm mt-1">Tenants will only be able to configure Custom manual targets for external Z-Sides.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
