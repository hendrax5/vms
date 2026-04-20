'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: any;
    perspective: string;
    isMmrRack?: boolean;
    isInternalAdmin?: boolean;
    customers?: any[];
    showLocationPicker?: boolean;
}

const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, onSubmit, initialData, perspective, isMmrRack, isInternalAdmin, customers = [], showLocationPicker }) => {
    const [deviceModels, setDeviceModels] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    
    // Topology and Location Picker State
    const [topology, setTopology] = useState<any[]>([]);
    const [selectedDcId, setSelectedDcId] = useState<string>('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [selectedRowId, setSelectedRowId] = useState<string>('');
    const [selectedRackId, setSelectedRackId] = useState<string>('');
    const [racks, setRacks] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({ 
        id: null, 
        name: '', 
        equipmentType: 'SERVER', 
        uStart: 1, 
        uEnd: 1, 
        orientation: 'FRONT', 
        status: 'Active', 
        portCount: 24, 
        customerId: '',
        deviceModelId: '',
        serialNumber: '',
        assetTag: '',
        rackId: ''
    });

    useEffect(() => {
        // Fetch device models
        fetch('/api/device-models')
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setDeviceModels(data);
            })
            .catch(err => console.error("Error fetching device models:", err));

        if (showLocationPicker) {
            fetch('/api/topology')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setTopology(data);
                })
                .catch(err => console.error("Error fetching topology:", err));
        }
    }, [showLocationPicker]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id || null,
                name: initialData.name || '',
                equipmentType: initialData.equipmentType || 'SERVER',
                uStart: initialData.uStart || 1,
                uEnd: initialData.uEnd || 1,
                orientation: initialData.orientation || (perspective === 'BOTH' ? 'FRONT' : perspective),
                status: initialData.status || 'Active',
                portCount: initialData.ports ? initialData.ports.length : 24,
                customerId: initialData.customerId ? initialData.customerId.toString() : '',
                deviceModelId: initialData.deviceModelId ? initialData.deviceModelId.toString() : '',
                serialNumber: initialData.serialNumber || '',
                assetTag: initialData.assetTag || '',
                rackId: initialData.rackId ? initialData.rackId.toString() : ''
            });

            if (initialData.deviceModelId) {
                const found = deviceModels.find(m => m.id.toString() === initialData.deviceModelId.toString());
                if (found) setSelectedModel(found);
            }
        }
    }, [initialData, perspective, deviceModels]);

    const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) {
            setSelectedModel(null);
            setFormData({ ...formData, deviceModelId: '' });
            return;
        }

        const model = deviceModels.find(m => m.id.toString() === val);
        if (model) {
            setSelectedModel(model);
            setFormData({
                ...formData,
                deviceModelId: val,
                equipmentType: model.equipmentType,
                portCount: model.portCount,
                uEnd: formData.uStart + model.uSize - 1
            });
        }
    };

    const handleUStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const start = parseInt(e.target.value) || 1;
        if (selectedModel) {
            setFormData({ ...formData, uStart: start, uEnd: start + selectedModel.uSize - 1 });
        } else {
            setFormData({ ...formData, uStart: start });
        }
    };

    // Location Picker Dependency Effects
    useEffect(() => {
        if (!showLocationPicker) return;
        const dc = topology.find(d => d.id.toString() === selectedDcId);
        const room = dc?.rooms?.find(r => r.id.toString() === selectedRoomId);
        const row = room?.rows?.find(rw => rw.id.toString() === selectedRowId);
        setRacks(row?.racks || []);
    }, [topology, selectedDcId, selectedRoomId, selectedRowId, showLocationPicker]);

    // Initialize Picker if Initial Data provided
    useEffect(() => {
        if (showLocationPicker && initialData && formData.rackId && topology.length > 0) {
            // Find rack in topology
            let matchDc, matchRoom, matchRow, matchRack;
            for (let dc of topology) {
                for (let room of dc.rooms || []) {
                    for (let row of room.rows || []) {
                        let rack = row.racks?.find(r => r.id.toString() === formData.rackId);
                        if (rack) {
                            matchDc = dc; matchRoom = room; matchRow = row; matchRack = rack;
                            break;
                        }
                    }
                }
            }
            if (matchRack) {
                setSelectedDcId(matchDc.id.toString());
                setSelectedRoomId(matchRoom.id.toString());
                setSelectedRowId(matchRow.id.toString());
                setSelectedRackId(matchRack.id.toString());
            }
        }
    }, [showLocationPicker, initialData, topology, formData.rackId]);

    const submitHandler = () => {
        const finalData = { ...formData };
        if (showLocationPicker && selectedRackId) {
            finalData.rackId = selectedRackId;
        }
        onSubmit(finalData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-extrabold text-white uppercase tracking-widest">{formData.id ? 'Modify Device' : 'Device Provisioning'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="overflow-y-auto p-8 flex-1">
                    <form id="deviceForm" onSubmit={(e) => { e.preventDefault(); submitHandler(); }} className="space-y-6">
                        
                        {/* 0. Location Picker (Optional) */}
                        {showLocationPicker && (
                            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-4">
                                <label className="text-[10px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded inline-block uppercase tracking-widest mb-2">Location Mapping</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Datacenter</label>
                                        <select value={selectedDcId} onChange={(e) => { setSelectedDcId(e.target.value); setSelectedRoomId(''); setSelectedRowId(''); setSelectedRackId(''); }} className="w-full bg-black border border-white/10 rounded-xl p-2 text-white focus:border-emerald-500 text-sm">
                                            <option value="">-- Choose DC --</option>
                                            {topology.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Room</label>
                                        <select value={selectedRoomId} onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedRowId(''); setSelectedRackId(''); }} disabled={!selectedDcId} className="w-full bg-black border border-white/10 rounded-xl p-2 text-white focus:border-emerald-500 text-sm disabled:opacity-50">
                                            <option value="">-- Choose Room --</option>
                                            {topology.find(d => d.id.toString() === selectedDcId)?.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Row</label>
                                        <select value={selectedRowId} onChange={(e) => { setSelectedRowId(e.target.value); setSelectedRackId(''); }} disabled={!selectedRoomId} className="w-full bg-black border border-white/10 rounded-xl p-2 text-white focus:border-emerald-500 text-sm disabled:opacity-50">
                                            <option value="">-- Choose Row --</option>
                                            {topology.find(d => d.id.toString() === selectedDcId)?.rooms?.find(r => r.id.toString() === selectedRoomId)?.rows?.map(rw => <option key={rw.id} value={rw.id}>{rw.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Rack</label>
                                        <select required={showLocationPicker} value={selectedRackId} onChange={(e) => setSelectedRackId(e.target.value)} disabled={!selectedRowId} className="w-full bg-black border border-emerald-900 rounded-xl p-2 text-white focus:border-emerald-500 text-sm disabled:opacity-50">
                                            <option value="">-- Choose Rack --</option>
                                            {racks.map(rack => <option key={rack.id} value={rack.id}>{rack.name} ({rack.uCapacity}U)</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1. Device Template Selection */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 block">1. Select Device Template (Master Catalog)</label>
                            <select 
                                value={formData.deviceModelId} 
                                onChange={handleModelSelect}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                            >
                                <option value="">-- Custom / Manual Configuration --</option>
                                {deviceModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.brand} - {m.modelName} ({m.equipmentType}, {m.portCount} Ports, {m.uSize}U)</option>
                                ))}
                            </select>
                            {selectedModel && (
                                <div className="mt-2 text-xs text-slate-400 flex gap-4">
                                    <span>Brand: <b>{selectedModel.brand}</b></span>
                                    <span>Type: <b>{selectedModel.equipmentType}</b></span>
                                    <span>Ports: <b>{selectedModel.portCount}</b></span>
                                    <span>U-Size: <b>{selectedModel.uSize}U</b></span>
                                </div>
                            )}
                        </div>

                        {/* 2. Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Hardware Label / Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="e.g. SW-CORE-01" />
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                                <select value={formData.equipmentType} onChange={e => setFormData({...formData, equipmentType: e.target.value})} disabled={!!selectedModel || !!formData.id} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="SERVER">SERVER</option>
                                    <option value="SWITCH">SWITCH</option>
                                    <option value="ROUTER">ROUTER</option>
                                    <option value="PATCH_PANEL">PATCH_PANEL</option>
                                    <option value="OTB">OTB</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Orientation / Side</label>
                                <select value={formData.orientation} onChange={e => setFormData({...formData, orientation: e.target.value})} disabled={!!formData.id} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="FRONT">FRONT</option>
                                    <option value="BACK">REAR</option>
                                    <option value="BOTH">BOTH</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. Tracking & IDs */}
                        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block flex justify-between">
                                        <span>Serial Number</span>
                                        {selectedModel && !selectedModel.requiresSerialNumber && <span className="text-orange-400">Not Required</span>}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.serialNumber} 
                                        onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                                        required={selectedModel ? selectedModel.requiresSerialNumber : false}
                                        placeholder="Factory SN"
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 block">Internal Asset Tag</label>
                                    <input 
                                        type="text" 
                                        value={formData.assetTag} 
                                        onChange={e => setFormData({...formData, assetTag: e.target.value})} 
                                        placeholder="Leave blank to auto-generate"
                                        className="w-full bg-black border border-emerald-900 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. Placement & Capacity */}
                        <div className="grid grid-cols-2 gap-4">
                            {!formData.id && (
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Port Capacity (Initial Setup)</label>
                                    <input type="number" min="0" max="1000" value={formData.portCount} onChange={e => setFormData({...formData, portCount: parseInt(e.target.value) || 0})} disabled={!!selectedModel} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                                </div>
                            )}
                            {formData.id && (
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Current Port Capacity</label>
                                    <input type="number" readOnly value={formData.portCount} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-slate-400 outline-none opacity-70 cursor-not-allowed" />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-Start</label>
                                <input type="number" value={formData.uStart} onChange={handleUStartChange} disabled={!!formData.id} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">U-End</label>
                                <input type="number" value={formData.uEnd} onChange={e => setFormData({...formData, uEnd: parseInt(e.target.value)})} disabled={!!selectedModel || !!formData.id} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                        </div>

                        {/* 5. Admin specific */}
                        {isMmrRack && isInternalAdmin && !['PATCH_PANEL', 'OTB'].includes(formData.equipmentType) && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Assign to Customer (Optional)</label>
                                <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                    <option value="">-- Datacenter / Internal --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Operational Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </select>
                        </div>

                    </form>
                </div>

                <div className="p-8 border-t border-white/10 shrink-0 bg-slate-900">
                    <button form="deviceForm" type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/20 transition-all">{formData.id ? 'Update Configuration' : 'Commit Configuration'}</button>
                </div>
            </motion.div>
        </div>
    );
};

export default DeviceModal;
