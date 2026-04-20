'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ShieldAlert, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface DeviceModel {
    id: number;
    brand: string;
    modelName: string;
    equipmentType: string;
    uSize: number;
    portCount: number;
    requiresSerialNumber: boolean;
    powerDrawW: number | null;
}

export default function DeviceModelsPage() {
    const [models, setModels] = useState<DeviceModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<DeviceModel | null>(null);
    const [formData, setFormData] = useState({
        brand: '',
        modelName: '',
        equipmentType: 'SERVER',
        uSize: 1,
        portCount: 24,
        requiresSerialNumber: true,
        powerDrawW: ''
    });

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const res = await fetch('/api/device-models');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            setModels(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (model?: DeviceModel) => {
        if (model) {
            setEditingModel(model);
            setFormData({
                brand: model.brand,
                modelName: model.modelName,
                equipmentType: model.equipmentType,
                uSize: model.uSize,
                portCount: model.portCount,
                requiresSerialNumber: model.requiresSerialNumber,
                powerDrawW: model.powerDrawW ? model.powerDrawW.toString() : ''
            });
        } else {
            setEditingModel(null);
            setFormData({
                brand: '',
                modelName: '',
                equipmentType: 'SWITCH',
                uSize: 1,
                portCount: 24,
                requiresSerialNumber: true,
                powerDrawW: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingModel(null);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const url = editingModel ? `/api/device-models/${editingModel.id}` : '/api/device-models';
            const method = editingModel ? 'PATCH' : 'POST';

            const payload = {
                ...formData,
                uSize: parseInt(formData.uSize.toString()) || 1,
                portCount: parseInt(formData.portCount.toString()) || 0,
                powerDrawW: formData.powerDrawW ? parseInt(formData.powerDrawW) : null
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Operation failed');
            }

            await fetchModels();
            closeModal();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this device model?')) return;
        
        try {
            const res = await fetch(`/api/device-models/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }
            await fetchModels();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleExport = () => {
        const dataToExport = models.map(m => ({
            "ID (Optional)": m.id,
            "Brand": m.brand,
            "Model Name": m.modelName,
            "Type": m.equipmentType,
            "Size (U)": m.uSize,
            "Ports": m.portCount,
            "Requires SN": m.requiresSerialNumber ? 'YES' : 'NO'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Templates");
        XLSX.writeFile(wb, `Device_Templates_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                
                const payloads = data.map((row: any) => ({
                    id: row['ID (Optional)'] || undefined,
                    brand: row['Brand'],
                    modelName: row['Model Name'],
                    equipmentType: row['Type'] || 'SERVER',
                    uSize: parseInt(row['Size (U)']) || 1,
                    portCount: parseInt(row['Ports']) || 0,
                    requiresSerialNumber: row['Requires SN']?.toString().toUpperCase() !== 'NO'
                }));

                if (payloads.length === 0) throw new Error("No data found");

                const res = await fetch('/api/device-models/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloads)
                });

                const result = await res.json();
                if (res.ok) {
                    toast.success(`Import finished! Success: ${result.successCount}, Failed: ${result.failedCount}`);
                    if (result.errors?.length) {
                        toast.error(`Some imports failed. Example: ${result.errors[0]?.message}`);
                    }
                    fetchModels();
                } else {
                    toast.error(result.error || 'Import failed');
                }
            } catch (err: any) {
                console.error(err);
                toast.error(err.message || 'Error processing excel file');
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    if (loading) return <div className="p-8 text-emerald-500">Loading master catalog...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center bg-slate-900 p-8 rounded-3xl border border-white/5">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Master Device Catalog</h1>
                    <p className="text-slate-400 mt-2">Manage standardized hardware templates for datacenter provisioning.</p>
                </div>
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <button 
                        onClick={handleExport}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-r border-slate-800"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-r border-slate-800"
                    >
                        <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                    <button onClick={() => openModal()} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 transition-all">
                        <Plus className="w-5 h-5" /> Add Template
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-black/40 text-xs uppercase tracking-widest text-slate-500 border-b border-white/10">
                            <th className="p-6 font-semibold">Brand</th>
                            <th className="p-6 font-semibold">Model Name</th>
                            <th className="p-6 font-semibold">Type</th>
                            <th className="p-6 font-semibold text-center">Size (U)</th>
                            <th className="p-6 font-semibold text-center">Ports</th>
                            <th className="p-6 font-semibold text-center">Req. SN</th>
                            <th className="p-6 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {models.map(model => (
                            <tr key={model.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-6 text-white font-medium">{model.brand}</td>
                                <td className="p-6 text-emerald-400 font-bold">{model.modelName}</td>
                                <td className="p-6">
                                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold tracking-widest">{model.equipmentType}</span>
                                </td>
                                <td className="p-6 text-center text-slate-300">{model.uSize}</td>
                                <td className="p-6 text-center text-slate-300">{model.portCount}</td>
                                <td className="p-6 text-center">
                                    {model.requiresSerialNumber ? (
                                        <span className="text-emerald-500 font-bold">YES</span>
                                    ) : (
                                        <span className="text-orange-500 font-bold">NO</span>
                                    )}
                                </td>
                                <td className="p-6 text-right space-x-2">
                                    <button onClick={() => openModal(model)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(model.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {models.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-500">
                                    No device templates found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <h2 className="text-xl font-extrabold text-white uppercase tracking-widest">{editingModel ? 'Edit Template' : 'New Template'}</h2>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white"><Plus className="w-6 h-6 rotate-45" /></button>
                        </div>
                        
                        {error && (
                            <div className="mx-8 mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Brand (e.g. Cisco)</label>
                                    <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                                    <select value={formData.equipmentType} onChange={e => setFormData({...formData, equipmentType: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                        <option value="SERVER">SERVER</option>
                                        <option value="SWITCH">SWITCH</option>
                                        <option value="ROUTER">ROUTER</option>
                                        <option value="PATCH_PANEL">PATCH_PANEL</option>
                                        <option value="OTB">OTB</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Model Name (Must be unique)</label>
                                <input required type="text" value={formData.modelName} onChange={e => setFormData({...formData, modelName: e.target.value})} placeholder="e.g. Nexus 93180YC-EX" className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-Size (Height)</label>
                                    <input required type="number" min="1" max="42" value={formData.uSize} onChange={e => setFormData({...formData, uSize: parseInt(e.target.value) || 1})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Port Capacity</label>
                                    <input required type="number" min="0" value={formData.portCount} onChange={e => setFormData({...formData, portCount: parseInt(e.target.value) || 0})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" />
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between cursor-pointer" onClick={() => setFormData({...formData, requiresSerialNumber: !formData.requiresSerialNumber})}>
                                <div>
                                    <p className="text-sm font-bold text-white">Requires Factory Serial Number</p>
                                    <p className="text-xs text-slate-400 mt-1">If OFF, operators can just use Datacenter Asset Tag.</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${formData.requiresSerialNumber ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.requiresSerialNumber ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all mt-4">
                                Save Template
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
