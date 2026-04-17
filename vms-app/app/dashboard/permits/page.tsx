'use client';

import { Users, CheckCircle, Clock, XCircle, Search, Plus, X, FileText, Printer, ShieldCheck, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PermitsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || '';
    const userRoleLower = userRole.toLowerCase().replace(/\s+/g, '');
    const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRoleLower);

    useEffect(() => {
        if (session && !isInternalAdmin && userRoleLower !== '') {
            window.location.href = '/dashboard';
        }
    }, [session, isInternalAdmin, userRoleLower]);

    const [permits, setPermits] = useState<any[]>([]);
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [accessCards, setAccessCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [targetPermit, setTargetPermit] = useState<any>(null);
    const [processingPermit, setProcessingPermit] = useState<any>(null);
    const [selectedCardId, setSelectedCardId] = useState('');

    const [formData, setFormData] = useState({
        datacenterId: '',
        customerId: '',
        companyName: '',
        visitorNames: '',
        activity: '',
        scheduledAt: ''
    });

    useEffect(() => {
        fetchPermits();
        fetchDatacenters();
        fetchCustomers();
        fetchAccessCards();
    }, []);

    const fetchAccessCards = async () => {
        try {
            const res = await fetch('/api/access-cards');
            if (res.ok) setAccessCards(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPermits = async () => {
        try {
            const res = await fetch('/api/permits');
            if (res.ok) {
                const data = await res.json();
                setPermits(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDatacenters = async () => {
        try {
            const res = await fetch('/api/datacenters');
            if (res.ok) {
                const data = await res.json();
                setDatacenters(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            const res = await fetch('/api/permits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            const updatedPermit = await res.json();
            fetchPermits();
            if (processingPermit && processingPermit.id === id) {
                 setProcessingPermit(updatedPermit);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreatePermit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch('/api/permits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setIsModalOpen(false);
            setFormData({ datacenterId: '', customerId: '', companyName: '', visitorNames: '', activity: '', scheduledAt: '' });
            fetchPermits();
        } catch (error) {
            console.error('Failed to create permit', error);
        }
    };

    const handleAssignCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetPermit || !selectedCardId) return;
        try {
            await fetch('/api/access-cards/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permitId: targetPermit.id, cardId: selectedCardId })
            });
            setIsCardModalOpen(false);
            setTargetPermit(null);
            setSelectedCardId('');
            fetchPermits();
            fetchAccessCards();
        } catch (error) {
            console.error('Failed to assign card', error);
        }
    };

    const handleReleaseCard = async (cardId: string) => {
        try {
            await fetch('/api/access-cards/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId })
            });
            fetchPermits();
            fetchAccessCards();
        } catch (error) {
            console.error('Failed to release card', error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Live Visit Permits</h1>
                     <p className="text-muted-foreground mt-1">Manage and approve data center physical access requests in real-time.</p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={fetchPermits} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">
                         Refresh List
                     </button>
                     <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all">
                         <Plus className="w-4 h-4" />
                         Create Request
                     </button>
                 </div>
            </div>

            <div className="bg-card/50 border border-border/50 rounded-2xl backdrop-blur-xl overflow-hidden">
                 <div className="p-6 border-b border-border/50 flex items-center justify-between">
                     <div className="relative w-72">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <input 
                             type="text" 
                             placeholder="Search company or visitor..." 
                             className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-100 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                         />
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                     {loading ? (
                         <div className="p-8 text-center text-slate-400">Loading live data...</div>
                     ) : (
                         <table className="w-full text-sm text-left text-slate-300">
                             <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                 <tr>
                                     <th className="px-6 py-4 font-medium">Permit ID</th>
                                     <th className="px-6 py-4 font-medium">Datacenter</th>
                                     <th className="px-6 py-4 font-medium">Customer/Company</th>
                                     <th className="px-6 py-4 font-medium">Visitors</th>
                                     <th className="px-6 py-4 font-medium">Activity</th>
                                     <th className="px-6 py-4 font-medium">Date</th>
                                     <th className="px-6 py-4 font-medium">Status</th>
                                     <th className="px-6 py-4 font-medium text-right">Actions</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {permits.map((permit, idx) => (
                                     <motion.tr 
                                         initial={{ opacity: 0, y: 10 }}
                                         animate={{ opacity: 1, y: 0 }}
                                         transition={{ delay: idx * 0.1 }}
                                         key={permit.id} 
                                         className="border-b border-border/50 hover:bg-slate-800/30 transition-colors"
                                     >
                                         <td className="px-6 py-4 font-semibold text-blue-400">
                                             {permit.qrCodeToken || `PRM-${permit.id.toString().padStart(3, '0')}`}
                                         </td>
                                         <td className="px-6 py-4 text-slate-300">{permit.datacenter?.name || 'Unknown'}</td>
                                         <td className="px-6 py-4 font-medium text-slate-100">{permit.customer?.name || permit.companyName || 'Unknown'}</td>
                                         <td className="px-6 py-4">{permit.visitorNames}</td>
                                         <td className="px-6 py-4">{permit.activity}</td>
                                         <td className="px-6 py-4">{new Date(permit.scheduledAt).toLocaleDateString()}</td>
                                         <td className="px-6 py-4">
                                             {permit.status === 'Pending' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3 h-3" /> Pending</span>}
                                             {permit.status === 'Approved' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><CheckCircle className="w-3 h-3" /> Approved</span>}
                                             {permit.status === 'KioskVerified' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"><Camera className="w-3 h-3" /> Kiosk Verified</span>}
                                             {permit.status === 'Check In' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Users className="w-3 h-3" /> Check In</span>}
                                             {permit.status === 'CheckIn' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Users className="w-3 h-3" /> Check In</span>}
                                             {permit.status === 'Rejected' && <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" /> Rejected</span>}
                                         </td>
                                         <td className="px-6 py-4 text-right">
                                             <button onClick={() => setProcessingPermit(permit)} className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors border border-blue-500/30 px-3 py-1.5 rounded-md hover:bg-blue-500/10 inline-flex items-center gap-2">
                                                 <FileText className="w-4 h-4" /> View Detail
                                             </button>
                                         </td>
                                     </motion.tr>
                                 ))}
                                 {permits.length === 0 && (
                                     <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No permits found</td></tr>
                                 )}
                             </tbody>
                         </table>
                     )}
                 </div>
            </div>

            {/* Create Permit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-xl font-semibold text-slate-100">Create Visit Permit</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleCreatePermit} className="p-6 space-y-4">
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
                                        onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch(err) {} }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                                        style={{colorScheme: 'dark'}}
                                    />
                                </div>
                                
                                <div className="pt-4 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
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
                )}
            </AnimatePresence>
            {/* Processing / Detail Modal */}
            <AnimatePresence>
                {processingPermit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-100">Review Permit PRM-{processingPermit.id}</h2>
                                    <p className="text-xs text-muted-foreground mt-1">Tenant: {processingPermit.customer?.name || processingPermit.companyName}</p>
                                </div>
                                <button onClick={() => setProcessingPermit(null)} className="text-slate-400 hover:text-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                                         <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Target Facility</p>
                                         <p className="text-sm font-medium text-slate-200">{processingPermit.datacenter?.name}</p>
                                     </div>
                                     <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                                         <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Scheduled Date</p>
                                         <p className="text-sm font-medium text-slate-200">{new Date(processingPermit.scheduledAt).toLocaleDateString()}</p>
                                     </div>
                                </div>
                                
                                 <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Authorized Visitors</p>
                                     <div className="flex flex-wrap gap-2">
                                         {processingPermit.visitorNames.split(',').map((name: string, i: number) => (
                                             <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 font-medium">
                                                 {name.trim()}
                                             </span>
                                         ))}
                                     </div>
                                </div>

                                {processingPermit.visitorPhoto && (
                                    <div className="bg-slate-950 p-4 border border-indigo-500/30 rounded-lg">
                                         <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-3 flex items-center gap-2">
                                             <Camera className="w-3 h-3" /> Kiosk Identity Verification Photos
                                         </p>
                                         <div className="grid grid-cols-2 gap-3">
                                             {(() => {
                                                 try {
                                                     const photos = JSON.parse(processingPermit.visitorPhoto);
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
                                                     return (
                                                         <div className="col-span-2 p-4 text-center text-slate-500 italic text-xs">
                                                             Failed to load biometric data format
                                                         </div>
                                                     );
                                                 }
                                             })()}
                                         </div>
                                    </div>
                                )}

                                <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Activity Description / Logistical Payload</p>
                                     <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{processingPermit.activity}</p>
                                </div>

                                <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg text-center">
                                     <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Visitor Entry QR Code (For Customer)</p>
                                     {processingPermit.qrCodeToken ? (
                                         <div className="bg-white p-4 rounded-xl inline-block mb-4 border-4 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
                                             <QRCodeSVG value={processingPermit.qrCodeToken} size={160} level="H" />
                                         </div>
                                     ) : (
                                         <div className="py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                             <ShieldCheck className="w-12 h-12 text-slate-800 mx-auto mb-2 opacity-20" />
                                             <p className="text-xs text-slate-600 font-semibold italic">Token will be generated upon Approval</p>
                                         </div>
                                     )}
                                     {processingPermit.qrCodeToken && (
                                         <p className="text-[10px] font-mono text-slate-500 tracking-widest break-all mt-2 max-w-xs mx-auto">
                                             {processingPermit.qrCodeToken}
                                         </p>
                                     )}
                                </div>

                                {/* Intelligent Detect for Building Permits */}
                                {processingPermit.activity.includes('LEAVING BUILDING PERMIT REQ') && (
                                     <div className="bg-orange-950/30 border border-orange-900/50 p-5 rounded-xl">
                                         <h4 className="text-sm font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                             <FileText className="w-5 h-5" /> Requires Building Management Exit Pass
                                         </h4>
                                         <p className="text-xs text-orange-200/70 mb-4">
                                             This request includes outbound property that must physically egress the building. Before approving this permit, NOC must generate and procure a signed Building Security SIKA.
                                         </p>
                                         <Link target="_blank" href={`/dashboard/permits/${processingPermit.id}/print`} className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 text-sm font-bold rounded shadow-lg transition-colors">
                                             <Printer className="w-4 h-4" /> Print A4 Building Exit Letter
                                         </Link>
                                     </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                 <div>
                                     <span className="text-xs font-semibold text-slate-500 uppercase mr-3">Current Status:</span>
                                     <span className={`px-2 py-1 rounded text-xs font-bold ${processingPermit.status === 'Pending' ? 'bg-amber-500/20 text-amber-500' : processingPermit.status === 'Approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                         {processingPermit.status}
                                     </span>
                                     <span className="text-[10px] text-slate-600 font-mono ml-4">
                                         Expires: {new Date(new Date(processingPermit.scheduledAt).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString()}
                                     </span>
                                 </div>
                                 <div className="flex gap-3">
                                     {isInternalAdmin && (
                                         <>
                                             {processingPermit.status === 'Pending' && (
                                                 <>
                                                     <button onClick={() => handleUpdateStatus(processingPermit.id, 'Rejected')} className="px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-lg text-sm font-semibold transition-colors">
                                                         Reject
                                                     </button>
                                                     <button onClick={() => handleUpdateStatus(processingPermit.id, 'Approved')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20">
                                                         Approve Request
                                                     </button>
                                                 </>
                                             )}
                                             {processingPermit.status === 'Approved' && (
                                                  <button onClick={() => handleUpdateStatus(processingPermit.id, 'CheckIn')} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
                                                      Mark Check-In (Arrived)
                                                  </button>
                                             )}
                                             {processingPermit.status === 'KioskVerified' && (
                                                  <button onClick={() => handleUpdateStatus(processingPermit.id, 'CheckIn')} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20">
                                                      Confirm Kiosk Check-In
                                                  </button>
                                             )}
                                             {(processingPermit.status === 'CheckIn' || processingPermit.status === 'Check In' || processingPermit.status === 'KioskVerified') && (
                                                  (() => {
                                                      const assignedCard = accessCards.find(c => c.currentPermitId === processingPermit.id);
                                                      if (assignedCard) {
                                                          return (
                                                              <button onClick={() => handleReleaseCard(assignedCard.id)} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
                                                                  Release Card {assignedCard.cardNumber}
                                                              </button>
                                                          );
                                                      } else {
                                                          return (
                                                              <button onClick={() => { setTargetPermit(processingPermit); setIsCardModalOpen(true); }} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-amber-500/20">
                                                                  Assign Access Card (Collect KTP)
                                                              </button>
                                                          );
                                                      }
                                                  })()
                                             )}
                                         </>
                                     )}
                                     <button onClick={() => setProcessingPermit(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors ml-4">
                                         Close View
                                     </button>
                                 </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Assign Card Modal */}
            <AnimatePresence>
                {isCardModalOpen && targetPermit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-xl font-semibold text-slate-100">Assign Access Card</h2>
                                <button onClick={() => { setIsCardModalOpen(false); setTargetPermit(null); }} className="text-slate-400 hover:text-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleAssignCard} className="p-6 space-y-4">
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
                )}
            </AnimatePresence>
        </div>
    );
}
