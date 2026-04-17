'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Calendar, Package, ArrowRight, ShieldCheck, X, Plus, Users, Search, Truck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantAccess({ permits, goods, customerId, onRefresh, datacenters, equipments = [], tenantUsers = [] }: any) {
    const [activeTab, setActiveTab] = useState<'VISIT' | 'GOODS'>('VISIT');
    const [selectedQR, setSelectedQR] = useState<{ type: string, code: string, title: string } | null>(null);
    
    // Derived Racks from equipments
    const racksMap = new Map();
    equipments.forEach((eq: any) => {
        if (eq.rack && !racksMap.has(eq.rackId)) {
            const dcId = eq.rack.row?.room?.datacenterId;
            racksMap.set(eq.rackId, { ...eq.rack, datacenterId: dcId });
        }
    });
    const customerRacks = Array.from(racksMap.values());

    // Unified Form State
    const [isSmartRequestOpen, setIsSmartRequestOpen] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [accessFormData, setAccessFormData] = useState({ 
        intent: 'Visit Only', // Visit Only, Inbound Logistics, Outbound Logistics
        datacenterId: '', 
        activity: '', 
        scheduledAt: '', 
        // Cargo specific fields
        outboundAssetId: '',
        name: '', 
        deviceType: 'Server', 
        sn: '', 
        dimension: '1U', 
        targetRackName: '',
        targetU: '',
        isLeavingBuilding: false
    });

    // Dynamic Filtered Targets
    const filteredRacks = accessFormData.datacenterId 
        ? customerRacks.filter((r: any) => r.datacenterId?.toString() === accessFormData.datacenterId) 
        : [];

    const filteredOutboundAssets = accessFormData.datacenterId
        ? equipments.filter((eq: any) => eq.rack?.row?.room?.datacenterId?.toString() === accessFormData.datacenterId)
        : [];

    const handleSelectOutboundAsset = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setAccessFormData(prev => ({ ...prev, outboundAssetId: '', name: '', sn: '', deviceType: 'Server', dimension: '', targetU: '', targetRackName: '' }));
            return;
        }
        const eq = equipments.find((x: any) => x.id.toString() === selectedId);
        if (eq) {
            const calcDim = eq.uEnd >= eq.uStart ? `${(eq.uEnd - eq.uStart) + 1}U` : 'Unknown';
            setAccessFormData(prev => ({
                ...prev,
                outboundAssetId: selectedId,
                name: eq.name,
                deviceType: eq.equipmentType || 'Server',
                sn: eq.sn || 'Unknown SN',
                dimension: calcDim,
                targetRackName: eq.rack?.name || 'Unknown Rack',
                targetU: `U${eq.uStart}-U${eq.uEnd}`
            }));
        }
    };

    // --- Personnel Builder Logic ---
    const PERMANENT_PICS = tenantUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role?.name || 'Staff'
    }));
    const [authorizedPersonnel, setAuthorizedPersonnel] = useState<{name: string, role: string}[]>([]);
    const [customName, setCustomName] = useState('');
    const [customRole, setCustomRole] = useState('Vendor');

    const addPermanentPIC = (pic: any) => {
        if (!authorizedPersonnel.find(p => p.name === pic.name)) {
            setAuthorizedPersonnel([...authorizedPersonnel, { name: pic.name, role: pic.role }]);
        }
    };

    const addCustomPIC = () => {
        if (customName.trim()) {
            setAuthorizedPersonnel([...authorizedPersonnel, { name: customName, role: customRole }]);
            setCustomName('');
        }
    };

    const removePersonnel = (name: string) => {
        setAuthorizedPersonnel(authorizedPersonnel.filter(p => p.name !== name));
    };

    const validateSubmission = () => {
        setValidationError('');
        if (authorizedPersonnel.length === 0) {
            setValidationError('You must assign at least one authorized person for this access request.');
            return false;
        }
        return true;
    };

    // --- Submission Handler ---
    const handleCreateSmartRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSubmission()) return;

        try {
            const visitorNamesExtracted = authorizedPersonnel.map(p => `${p.name} (${p.role})`).join(', ');
            
            // Build the Master Activity String for the Visit Permit
            let masterActivity = accessFormData.activity;
            if (accessFormData.intent !== 'Visit Only') {
                masterActivity = `[${accessFormData.intent.toUpperCase()}] ${accessFormData.name} | SN: ${accessFormData.sn}`;
                if (accessFormData.targetRackName) {
                    masterActivity += ` | Target Rack: ${accessFormData.targetRackName}`;
                }
                if (accessFormData.isLeavingBuilding) {
                    masterActivity += ` | LEAVING BUILDING PERMIT REQ`;
                }
            } else if (accessFormData.targetRackName) {
                masterActivity += ` [Target Rack: ${accessFormData.targetRackName}]`;
            }

            // 1. Create the Master Visit Permit
            const permitRes = await fetch('/api/permits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    datacenterId: parseInt(accessFormData.datacenterId),
                    visitorNames: visitorNamesExtracted || 'Unknown Visitor',
                    activity: masterActivity,
                    scheduledAt: new Date(accessFormData.scheduledAt).toISOString(),
                    customerId,
                })
            });
            const newPermit = await permitRes.json();

            // 2. If Hardware Logistics, spawn the GoodsItem dynamically linked!
            if (accessFormData.intent !== 'Visit Only') {
                const goodsStatus = accessFormData.intent === 'Inbound Logistics' ? 'Inbound' : 'Outbound';
                const goodsDesc = `[Attached to Visit PRM-${newPermit.id}] Type: ${accessFormData.deviceType} | Dim: ${accessFormData.dimension} | Slot: ${accessFormData.targetU || 'N/A'}${accessFormData.isLeavingBuilding ? ' | BUILDING EXIT' : ''}`;
                
                await fetch('/api/goods', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        datacenterId: parseInt(accessFormData.datacenterId),
                        name: accessFormData.name,
                        description: goodsDesc,
                        status: goodsStatus,
                        customerId
                    })
                });
            }

            // Cleanup & Reset
            setIsSmartRequestOpen(false);
            setAuthorizedPersonnel([]);
            setAccessFormData({ 
                intent: 'Visit Only', datacenterId: '', activity: '', scheduledAt: '', outboundAssetId: '',
                name: '', deviceType: 'Server', sn: '', dimension: '1U', targetRackName: '', targetU: '', isLeavingBuilding: false 
            });
            setValidationError('');
            onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            {/* TABS & MASTER BUTTON */}
            <div className="flex justify-between items-center border-b border-slate-800">
                <div className="flex">
                    <button 
                        onClick={() => setActiveTab('VISIT')}
                        className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'VISIT' ? 'border-red-500 text-slate-100 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                    >
                        Personnel Visits
                    </button>
                    <button 
                        onClick={() => setActiveTab('GOODS')}
                        className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'GOODS' ? 'border-red-500 text-slate-100 bg-slate-800/30' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                    >
                        Goods In/Out
                    </button>
                </div>
                <button onClick={() => setIsSmartRequestOpen(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2 uppercase tracking-wider mb-2">
                     <Plus className="w-4 h-4"/> Create Access Request
                </button>
            </div>

            {/* TAB: VISITS */}
            {activeTab === 'VISIT' && (
                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-300">
                             <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
                                 <tr>
                                     <th className="px-5 py-3">Badge ID</th>
                                     <th className="px-5 py-3">Facility</th>
                                     <th className="px-5 py-3">Manifest</th>
                                     <th className="px-5 py-3">Date</th>
                                     <th className="px-5 py-3">Status</th>
                                     <th className="px-5 py-3 text-right">Actions</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800">
                                 {permits.map((p: any) => (
                                     <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                                         <td className="px-5 py-4 font-mono text-xs text-red-400">PRM-{p.id}</td>
                                         <td className="px-5 py-4 font-mono text-xs text-slate-400">{p.datacenter?.name}</td>
                                         <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {p.visitorNames?.split(',').map((name: string, i: number) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-[10px] uppercase font-bold text-slate-300 rounded-sm shadow-sm">
                                                        {name.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                         </td>
                                         <td className="px-5 py-4 font-mono text-xs">{new Date(p.scheduledAt).toLocaleDateString()}</td>
                                         <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wide font-bold border ${p.status === 'Approved' ? 'bg-emerald-950 border-emerald-800 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                {p.status}
                                            </span>
                                         </td>
                                                                                   <td className="px-5 py-4 text-right">
                                              {p.status === 'Approved' || p.status === 'NDASigned' || p.status === 'CheckIn' ? (
                                                  <button 
                                                      onClick={() => setSelectedQR({ 
                                                          type: 'Visit', 
                                                          code: p.qrCodeToken || `PRM-${p.id}-PENDING`, 
                                                          title: `Access Badge PRM-${p.id}` 
                                                      })}
                                                      className="text-slate-400 hover:text-red-400 transition-colors inline-flex items-center gap-1.5 font-semibold text-xs border border-transparent hover:border-red-900 px-2 py-1 bg-slate-950 shadow-sm"
                                                  >
                                                      <QrCode className="w-4 h-4" /> ACCESS QR
                                                  </button>
                                              ) : (
                                                  <div className="flex items-center justify-end gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                                                      <AlertTriangle className="w-3 h-3 text-amber-500" /> Waiting Approval
                                                  </div>
                                              )}
                                          </td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: GOODS */}
            {activeTab === 'GOODS' && (
                <div className="space-y-4">
                    {goods.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 p-8 text-center rounded-sm">
                            <Package className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                            <h4 className="text-slate-400 font-semibold mb-2">No Active Logistics</h4>
                            <p className="text-sm text-slate-500">Your goods tracking history will appear here once requested.</p>
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3">Tracking ID</th>
                                        <th className="px-5 py-3">Facility</th>
                                        <th className="px-5 py-3">Asset Profile</th>
                                        <th className="px-5 py-3">Direction</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {goods.map((g: any) => (
                                        <tr key={g.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-5 py-4 font-mono text-xs text-red-400">{g.qrCode}</td>
                                            <td className="px-5 py-4 font-mono text-xs text-slate-400">{g.datacenter?.name}</td>
                                            <td className="px-5 py-4">
                                                <span className="font-bold text-slate-200 block truncate max-w-xs">{g.name}</span>
                                                <span className="text-xs text-slate-500 block break-all">{g.description}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold border ${g.status === 'Inbound' ? 'bg-blue-950 border-blue-900 text-blue-400' : 'bg-orange-950 border-orange-900 text-orange-400'}`}>
                                                    {g.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedQR({ type: 'Goods', code: g.qrCode, title: `Asset ${g.id}` })}
                                                    className="text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1.5 font-semibold text-xs border border-transparent hover:border-blue-900 px-2 py-1 bg-slate-950 shadow-sm"
                                                >
                                                    <QrCode className="w-4 h-4" /> WAYBILL
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* UNIFIED SMART REQUEST MODAL WIZARD */}
            <AnimatePresence>
                {isSmartRequestOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-950 border border-slate-800 w-full max-w-4xl shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
                             {/* Left Side: Policy & Form */}
                             <div className="w-full md:w-7/12 flex flex-col border-r border-slate-800">
                                 <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-slate-100">
                                      <h3 className="font-bold uppercase tracking-wide text-sm flex gap-2 items-center"><ShieldCheck className="w-4 h-4 text-red-500"/> Submit New Access Request</h3>
                                      <button onClick={() => setIsSmartRequestOpen(false)} className="md:hidden"><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
                                 </div>
                                 <div className="p-6 bg-slate-950 flex-grow space-y-5">
                                     <form id="smartAccessForm" onSubmit={handleCreateSmartRequest} className="space-y-4">
                                         
                                         {/* INTENT SELECTOR */}
                                         <div className="bg-slate-900 border border-slate-800 p-4 mb-4">
                                            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">Primary Intent of Visit</label>
                                            <div className="flex gap-2">
                                                {['Visit Only', 'Inbound Logistics', 'Outbound Logistics'].map(intent => (
                                                    <button type="button" key={intent} onClick={() => setAccessFormData({...accessFormData, intent})}
                                                        className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase transition-colors border ${accessFormData.intent === intent ? 'bg-red-900 border-red-800 text-red-200' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                                                        {intent}
                                                    </button>
                                                ))}
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Target Facility</label>
                                                <select required value={accessFormData.datacenterId} onChange={e => setAccessFormData({...accessFormData, datacenterId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100 focus:border-red-500 outline-none rounded-sm">
                                                    <option value="">Select a facility...</option>
                                                    {datacenters?.map((dc: any) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Target Rack (Optional)</label>
                                                <select value={accessFormData.targetRackName} onChange={e => setAccessFormData({...accessFormData, targetRackName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100 focus:border-red-500 outline-none rounded-sm">
                                                    <option value="">Select Rack...</option>
                                                    {filteredRacks.map((rack: any) => <option key={rack.id} value={rack.name}>{rack.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Arrival Date</label>
                                                <input type="date" required value={accessFormData.scheduledAt} onChange={e => setAccessFormData({...accessFormData, scheduledAt: e.target.value})} onClick={(e) => { try { (e.currentTarget as any).showPicker() } catch(err) {} }} className="w-full bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100 focus:border-red-500 outline-none rounded-sm" style={{colorScheme: 'dark'}}/>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Activities / Justification</label>
                                                <input type="text" required={accessFormData.intent === 'Visit Only'} value={accessFormData.activity} onChange={e => setAccessFormData({...accessFormData, activity: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100 focus:border-red-500 outline-none rounded-sm" placeholder={accessFormData.intent !== 'Visit Only' ? "(Optional) Context..." : "e.g. Server maintenance"}/>
                                            </div>
                                         </div>

                                         {/* DYNAMIC LOGISTICS MODULE */}
                                         {accessFormData.intent !== 'Visit Only' && (
                                            <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                                                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest"><Truck className="inline w-3 h-3 mr-1"/> Hardware Attachment</h4>
                                                
                                                {/* OUTBOUND SELECTOR */}
                                                {accessFormData.intent === 'Outbound Logistics' && (
                                                    <div className="bg-orange-950/20 border border-orange-900/50 p-3 rounded-sm">
                                                        <label className="block text-xs font-bold text-orange-400 uppercase mb-2">Select Deployed Asset to Remove</label>
                                                        <select required onChange={handleSelectOutboundAsset} className="w-full bg-slate-900 border border-orange-800/50 p-2 text-sm text-slate-100 focus:border-orange-500 outline-none rounded-sm">
                                                            <option value="">-- Catalog Search --</option>
                                                            {filteredOutboundAssets.map((eq: any) => (
                                                                <option key={eq.id} value={eq.id}>{eq.name} (SN: {eq.sn || 'Unknown'}) - {eq.rack?.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="col-span-2 sm:col-span-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Asset Name</label>
                                                        <input type="text" readOnly={accessFormData.intent === 'Outbound Logistics'} required value={accessFormData.name} onChange={e => setAccessFormData({...accessFormData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-slate-100 outline-none rounded-sm read-only:opacity-50" placeholder="e.g. Cisco Switch"/>
                                                    </div>
                                                    <div className="col-span-2 sm:col-span-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serial Number</label>
                                                        <input type="text" readOnly={accessFormData.intent === 'Outbound Logistics'} required value={accessFormData.sn} onChange={e => setAccessFormData({...accessFormData, sn: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-xs font-mono text-slate-100 outline-none rounded-sm read-only:opacity-50" placeholder="S/N"/>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Device Type</label>
                                                        <select disabled={accessFormData.intent === 'Outbound Logistics'} required value={accessFormData.deviceType} onChange={e => setAccessFormData({...accessFormData, deviceType: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-slate-100 outline-none rounded-sm disabled:opacity-50">
                                                            <option>Server</option>
                                                            <option>Switch / Router</option>
                                                            <option>Storage Array</option>
                                                            <option>Parts / Cables</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dimension/U</label>
                                                        <input type="text" readOnly={accessFormData.intent === 'Outbound Logistics'} required value={accessFormData.dimension} onChange={e => setAccessFormData({...accessFormData, dimension: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-slate-100 outline-none rounded-sm read-only:opacity-50" placeholder="e.g. 1U"/>
                                                    </div>
                                                     <div className="col-span-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Slot Info</label>
                                                        <input type="text" readOnly={accessFormData.intent === 'Outbound Logistics'} required value={accessFormData.targetU} onChange={e => setAccessFormData({...accessFormData, targetU: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 text-xs text-slate-100 outline-none rounded-sm read-only:opacity-50" placeholder="e.g. U14-U15"/>
                                                    </div>
                                                </div>

                                                {/* BUILDING EXIT PASS LOGIC */}
                                                {accessFormData.intent === 'Outbound Logistics' && (
                                                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-sm flex items-start gap-3 mt-4">
                                                        <input 
                                                            type="checkbox" 
                                                            id="leavingBuildingCheck" 
                                                            checked={accessFormData.isLeavingBuilding}
                                                            onChange={e => setAccessFormData({...accessFormData, isLeavingBuilding: e.target.checked})}
                                                            className="mt-1 w-4 h-4 bg-slate-900 border-slate-700 accent-red-600"
                                                        />
                                                        <div>
                                                            <label htmlFor="leavingBuildingCheck" className="text-sm font-bold text-red-400 block cursor-pointer">Requires Building Exit Pass (Leaving Premises)</label>
                                                            <p className="text-xs text-slate-400 mt-1">If the cargo needs to physically leave the multi-story building, check this box. Building Management ONLY processes exit passes Mon-Fri, 09:00 - 17:00.</p>
                                                            {accessFormData.isLeavingBuilding && (
                                                                <p className="text-[10px] text-orange-400 font-bold uppercase mt-2 border-t border-red-900/50 pt-2">Note: You may schedule a weekend removal, but your request will remain Pending until the DC Team prints the exit pass during office hours.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                         )}
                                     </form>

                                     {validationError && (
                                         <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="bg-red-950/50 border border-red-900/50 p-3 rounded-sm flex items-center gap-3">
                                             <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                             <p className="text-xs text-red-200">{validationError}</p>
                                         </motion.div>
                                     )}
                                 </div>
                                 <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between">
                                     <button type="button" onClick={() => setIsSmartRequestOpen(false)} className="text-xs uppercase font-bold text-slate-400 hover:text-white">Cancel</button>
                                     <button form="smartAccessForm" type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 font-bold uppercase text-white text-xs tracking-wider">
                                         Submit Access Request
                                     </button>
                                 </div>
                             </div>

                             {/* Right Side: Personnel Builder */}
                             <div className="w-full md:w-5/12 bg-slate-900 flex flex-col relative">
                                  <button onClick={() => setIsSmartRequestOpen(false)} className="absolute top-4 right-4 hidden md:block"><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
                                  <div className="p-6">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">Assign Personnel</h4>
                                      
                                      {/* Selected Roster */}
                                      <div className="min-h-[100px] bg-slate-950 border border-slate-800 p-3 mb-6">
                                          {authorizedPersonnel.length === 0 ? (
                                              <p className="text-[10px] text-red-400/80 text-center py-4 uppercase font-bold tracking-widest">At least 1 person required</p>
                                          ) : (
                                              <div className="flex flex-col gap-2">
                                                  {authorizedPersonnel.map(p => (
                                                      <div key={p.name} className="flex justify-between items-center bg-slate-900 border border-slate-700 px-3 py-1.5">
                                                          <div>
                                                              <span className="font-bold text-slate-200 text-xs block">{p.name}</span>
                                                              <span className="text-[10px] uppercase font-mono text-slate-500">{p.role}</span>
                                                          </div>
                                                          <button type="button" onClick={() => removePersonnel(p.name)} className="text-red-500 hover:text-red-400"><X className="w-3 h-3"/></button>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>

                                      {/* Add from Permanent PICs */}
                                      <div className="space-y-3 mb-6">
                                           <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Permanent PIC Catalog</span>
                                           </div>
                                           <div className="grid grid-cols-1 gap-2">
                                                {PERMANENT_PICS.map((pic: any) => (
                                                    <button 
                                                        type="button"
                                                        onClick={() => addPermanentPIC(pic)}
                                                        disabled={!!authorizedPersonnel.find(p => p.name === pic.name)}
                                                        key={pic.id} 
                                                        className="flex justify-between items-center bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 p-2 text-left transition-colors"
                                                    >
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-200 block">{pic.name}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{pic.role}</span>
                                                        </div>
                                                        <Plus className="w-3 h-3 text-slate-400" />
                                                    </button>
                                                ))}
                                           </div>
                                      </div>

                                      {/* Manual Add */}
                                      <div className="border border-slate-800 bg-slate-950 p-4">
                                           <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-3">Add Custom Person</span>
                                           <div className="flex flex-col gap-2">
                                               <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Full Legal Name" className="bg-slate-900 border border-slate-700 p-1.5 text-xs text-white" />
                                               <div className="flex gap-2">
                                                   <select value={customRole} onChange={(e) => setCustomRole(e.target.value)} className="bg-slate-900 border border-slate-700 p-1.5 text-xs text-slate-300 w-1/2">
                                                       <option>Vendor</option>
                                                       <option>Contractor</option>
                                                       <option>VIP</option>
                                                   </select>
                                                   <button type="button" onClick={addCustomPIC} className="bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold uppercase p-1.5 w-1/2 border border-slate-700">Append</button>
                                               </div>
                                           </div>
                                      </div>
                                  </div>
                             </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Modal Equinix Style */}
            <AnimatePresence>
                {selectedQR && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-100 w-[340px] shadow-2xl relative overflow-hidden">
                             <div className={`h-2 w-full ${selectedQR.type === 'Visit' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                             <div className="p-6 text-center text-slate-900 border-b border-slate-300">
                                 {selectedQR.type === 'Visit' ? <ShieldCheck className="w-8 h-8 mx-auto text-red-600 mb-2" /> : <Package className="w-8 h-8 mx-auto text-blue-600 mb-2" />}
                                 <h2 className="text-xl font-extrabold uppercase tracking-widest">{selectedQR.title}</h2>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{selectedQR.type === 'Visit' ? 'Visitor Entry Permit' : 'Logistics Waybill Tracking'}</p>
                             </div>
                             <div className="p-8 bg-white flex flex-col items-center">
                                 <div className="p-3 border-2 border-slate-200">
                                    <QRCodeSVG value={selectedQR.code} size={200} level="H" />
                                 </div>
                                 <p className="mt-6 text-xs text-slate-500 font-mono tracking-[0.2em]">{selectedQR.code}</p>
                             </div>
                             <div className="bg-slate-900 p-4">
                                <button onClick={() => setSelectedQR(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase text-xs tracking-wider transition-colors">Close ID Badge</button>
                             </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
