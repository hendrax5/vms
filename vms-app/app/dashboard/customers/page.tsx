'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, Trash2, Search, AlertTriangle, X, Building2, GitMerge, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', code: '', contactEmail: '', contactPhone: '' });
    
    // Merge Modal States
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergingSource, setMergingSource] = useState<any>(null);
    const [mergeTargetId, setMergeTargetId] = useState('');
    
    // Alert state
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (customer: any = null) => {
        setErrorMsg('');
        if (customer) {
            setEditingCustomer(customer.id);
            setFormData({
                name: customer.name,
                code: customer.code || '',
                contactEmail: customer.contactEmail || '',
                contactPhone: customer.contactPhone || ''
            });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', code: '', contactEmail: '', contactPhone: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const method = editingCustomer ? 'PUT' : 'POST';
        const url = editingCustomer ? `/api/customers/${editingCustomer}` : '/api/customers';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            
            setIsModalOpen(false);
            fetchCustomers();
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');
            fetchCustomers();
        } catch (e: any) {
            alert(e.message); // Show error if they own racks
        }
    };

    const handleMerge = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!mergeTargetId) {
            setErrorMsg('Please select a target tenant.');
            return;
        }
        
        try {
            const res = await fetch('/api/customers/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: mergingSource.id,
                    targetId: mergeTargetId
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to merge');
            
            setIsMergeModalOpen(false);
            setMergingSource(null);
            setMergeTargetId('');
            fetchCustomers();
            alert(data.message);
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    const displayUsers = customers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
    );

    const handleExport = () => {
        const dataToExport = customers.map(c => ({
            "ID (Optional)": c.id,
            "Company Name": c.name,
            "Identifier Code": c.code || '',
            "Contact Email": c.contactEmail || '',
            "Contact Phone": c.contactPhone || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tenants");
        XLSX.writeFile(wb, `Tenants_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setErrorMsg('');
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
                    name: row['Company Name'],
                    code: row['Identifier Code']?.toString() || null,
                    contactEmail: row['Contact Email']?.toString() || null,
                    contactPhone: row['Contact Phone']?.toString() || null
                }));

                if (payloads.length === 0) throw new Error("No data found");

                const res = await fetch('/api/customers/bulk', {
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
                    fetchCustomers();
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-emerald-400" />
                        Tenant & Provider Management
                    </h1>
                    <p className="text-neutral-400">Manage all registered companies, carriers, and tenants in the facility.</p>
                </div>
                
                <div className="flex bg-[#111] border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                    <button 
                        onClick={handleExport}
                        className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors border-r border-neutral-800"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors border-r border-neutral-800"
                    >
                        <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 font-medium transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add Tenant
                    </button>
                </div>
            </div>

            <div className="bg-[#111] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                    <Search className="w-5 h-5 text-neutral-500" />
                    <input 
                        type="text" 
                        placeholder="Search tenants..." 
                        className="bg-transparent border-none text-white focus:ring-0 w-full"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 text-sm">
                                <th className="p-4 font-medium">No</th>
                                <th className="p-4 font-medium">Company Name</th>
                                <th className="p-4 font-medium">Identifier Code</th>
                                <th className="p-4 font-medium">Contact Email</th>
                                <th className="p-4 font-medium">Active Assets</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-neutral-500">Loading tenants...</td>
                                </tr>
                            ) : displayUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-neutral-500">No tenants found matching your search.</td>
                                </tr>
                            ) : displayUsers.map((c, i) => (
                                <tr key={c.id} className="hover:bg-neutral-900/50 transition-colors">
                                    <td className="p-4 text-neutral-500">{i + 1}</td>
                                    <td className="p-4 font-medium text-white">{c.name}</td>
                                    <td className="p-4 text-emerald-400">{c.code || '-'}</td>
                                    <td className="p-4 text-neutral-300">{c.contactEmail || '-'}</td>
                                    <td className="p-4 text-neutral-400 flex items-center gap-3">
                                        <div className="flex flex-col text-xs">
                                            <span>Racks/Eq: <b className="text-white">{c._count?.rackEquipments || 0}</b></span>
                                            <span>Cross-Connects: <b className="text-white">{c._count?.crossConnects || 0}</b></span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => { setMergingSource(c); setIsMergeModalOpen(true); setErrorMsg(''); setMergeTargetId(''); }}
                                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                                title="Merge Tenant"
                                            >
                                                <GitMerge className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenModal(c)}
                                                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
                                                title="Edit Tenant"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(c.id)}
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-6 border-b border-neutral-800">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {editingCustomer ? <Edit2 className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                                {editingCustomer ? 'Edit Tenant Profile' : 'Register New Tenant'}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Company / Carrier Name <span className="text-red-400">*</span></label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-[#111] border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    placeholder="e.g. PT Jaringan Nusantara"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Carrier / Client Code</label>
                                <input 
                                    type="text" 
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                    className="w-full bg-[#111] border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    placeholder="e.g. JN-01"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Contact Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.contactEmail}
                                        onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                                        className="w-full bg-[#111] border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        placeholder="noc@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">Contact Phone</label>
                                    <input 
                                        type="text" 
                                        value={formData.contactPhone}
                                        onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                                        className="w-full bg-[#111] border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        placeholder="+62..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-800 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 font-medium text-neutral-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-600/20"
                                >
                                    {editingCustomer ? 'Save Changes' : 'Create Tenant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MERGE MODAL */}
            {isMergeModalOpen && mergingSource && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col">
                        <button 
                            onClick={() => setIsMergeModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-6 border-b border-neutral-800">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                                <GitMerge className="w-5 h-5 text-red-500" />
                                Merge Tenant
                            </h2>
                        </div>
                        
                        <form onSubmit={handleMerge} className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {errorMsg}
                                </div>
                            )}

                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 space-y-2">
                                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Warning: Data Destructive Action</p>
                                <p>You are about to merge <b>{mergingSource.name}</b> into another tenant. All assets, users, tickets, and cross-connects will be permanently transferred. The tenant <b>{mergingSource.name}</b> will be deleted.</p>
                                <p>This action cannot be undone.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Target Tenant (Keep this one) <span className="text-red-400">*</span></label>
                                <select
                                    required
                                    value={mergeTargetId}
                                    onChange={e => setMergeTargetId(e.target.value)}
                                    className="w-full bg-[#111] border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                >
                                    <option value="">Select target tenant...</option>
                                    {customers.filter(c => c.id !== mergingSource.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-800 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsMergeModalOpen(false)}
                                    className="px-4 py-2 font-medium text-neutral-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2 font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-600/20"
                                >
                                    Execute Merge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
