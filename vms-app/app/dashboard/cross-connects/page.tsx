"use client";

import {
  Network,
  Search,
  ArrowRightLeft,
  ShieldAlert,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Clock,
  Pencil,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function CrossConnectsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role?.toLowerCase() || "";
  const isInternalAdmin = ["superadmin", "nocadmin", "nocstaff"].includes(userRole);
  const sessionCustomerId = (session?.user as any)?.customerId;

  const [crossConnects, setCrossConnects] = useState<any[]>([]);
  const [datacenters, setDatacenters] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    id: undefined as number | undefined,
    datacenterId: "",
    customerId: "",
    mediaType: "Singlemode Fiber",
    sideARackId: "",
    sideAEquipmentId: "",
    sideAPortId: "",
    sideZRackId: "",
    sideZEquipmentId: "",
    sideZPortId: "",
    sideACompany: "",
    sideZCompany: "",
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCrossConnects();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    fetchDatacenters();
    fetchRacks();
    fetchCustomers();
  }, []);

  const fetchCrossConnects = async () => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/cross-connects?search=${encodeURIComponent(searchQuery)}`
        : "/api/cross-connects";
      const res = await fetch(url);
      const data = await res.json();
      setCrossConnects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatacenters = async () => {
    try {
      const res = await fetch("/api/datacenters");
      const data = await res.json();
      setDatacenters(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRacks = async () => {
    try {
      const res = await fetch("/api/racks");
      const data = await res.json();
      setRacks(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        datacenterId: parseInt(formData.datacenterId),
        customerId: formData.customerId ? parseInt(formData.customerId) : null,
        mediaType: formData.mediaType,
        sideAPortId: parseInt(formData.sideAPortId),
        sideZPortId: formData.sideZPortId ? parseInt(formData.sideZPortId) : null,
        sideACompany: formData.sideACompany || null,
        sideZCompany: formData.sideZCompany || null,
      };

      if (formData.id) {
        payload.id = formData.id;
        payload.action = "full_update";
      }

      const res = await fetch("/api/cross-connects", {
        method: formData.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchCrossConnects();
      } else {
        const data = await res.json();
        alert(data.error || "Operation failed");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      id: undefined,
      datacenterId: "",
      customerId: isInternalAdmin ? "" : sessionCustomerId?.toString() || "",
      mediaType: "Singlemode Fiber",
      sideARackId: "",
      sideAEquipmentId: "",
      sideAPortId: "",
      sideZRackId: "",
      sideZEquipmentId: "",
      sideZPortId: "",
      sideACompany: "",
      sideZCompany: "",
    });
  };

  const openModal = (cx?: any) => {
    if (cx) {
      setFormData({
        id: cx.id,
        datacenterId: cx.datacenterId?.toString() || "",
        customerId: cx.customerId?.toString() || "",
        mediaType: cx.mediaType || "Singlemode Fiber",
        sideARackId: cx.sideAPort?.equipment?.rackId?.toString() || "",
        sideAEquipmentId: cx.sideAPort?.equipmentId?.toString() || "",
        sideAPortId: cx.sideAPortId?.toString() || "",
        sideZRackId: cx.sideZPort?.equipment?.rackId?.toString() || "",
        sideZEquipmentId: cx.sideZPort?.equipmentId?.toString() || "",
        sideZPortId: cx.sideZPortId?.toString() || "",
        sideACompany: cx.sideACompany || "",
        sideZCompany: cx.sideZCompany || "",
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;
    try {
      const res = await fetch(`/api/cross-connects?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchCrossConnects();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await fetch("/api/cross-connects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchCrossConnects();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Cross-Connect Engine</h1>
          <p className="text-muted-foreground mt-1 text-sm">Path-mapping and logical port synchronization.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCrossConnects} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">Refresh</button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="w-4 h-4" /> Order Connection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <h3 className="font-semibold text-slate-100">Active Mappings</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search pathways..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded-lg pl-9 pr-4 py-2 focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>
          <div className="divide-y divide-slate-800">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm italic">Synchronizing with NOC Database...</div>
            ) : crossConnects.length === 0 ? (
              <div className="p-12 text-center text-slate-600 text-sm">No active cross-connects found.</div>
            ) : (
              crossConnects.map((cx, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={cx.id} className="p-5 hover:bg-slate-800/40 transition-all group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* ID & Customer */}
                    <div className="flex items-center gap-4 lg:w-48">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Network className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">CX-{cx.id.toString().padStart(4, "0")}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{cx.mediaType}</p>
                        {cx.customer && <p className="text-[10px] text-blue-400 font-medium mt-1 truncate max-w-[120px]">{cx.customer.name}</p>}
                      </div>
                    </div>

                    {/* Pathway */}
                    <div className="flex-1 grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50 relative">
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Side A</p>
                        <p className="text-xs text-slate-300 font-medium truncate">{cx.sideAPort?.equipment?.name || "Eq"} / {cx.sideAPort?.portName || "Port"}</p>
                        {cx.sideACompany && (
                          <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" /> {cx.sideACompany}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1 border-l border-slate-800/50 pl-4">
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Side Z</p>
                        <p className="text-xs text-slate-300 font-medium truncate">{cx.sideZPort?.equipment?.name || "Eq"} / {cx.sideZPort?.portName || "Port"}</p>
                        {cx.sideZCompany && (
                          <p className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                            {cx.sideZCompany} <Building2 className="w-2.5 h-2.5" />
                          </p>
                        )}
                      </div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-1 rounded-full text-slate-500 group-hover:text-blue-400 transition-colors">
                        <ArrowRightLeft className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-4">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${cx.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                        {cx.status}
                      </div>
                      {isInternalAdmin && (
                        <div className="flex gap-1.5">
                          {cx.status === 'Requested' && (
                            <button onClick={() => handleUpdateStatus(cx.id, 'Active')} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all" title="Activate"><CheckCircle className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => openModal(cx)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(cx.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-fit">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Automated Validation</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">Ports are logically isolated to prevent collisions. Every connection is cross-verified against the master infrastructure map.</p>
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex justify-between text-xs"><span className="text-slate-500">System Integrity</span><span className="text-emerald-400 font-bold">100% Secure</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Active Ports</span><span className="text-blue-400 font-bold">Verified</span></div>
          </div>
        </div>
      </div>

      {/* Modal Integration */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto border-t-blue-500/50">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><Network className="w-4 h-4 text-blue-400" /></div>
                  {formData.id ? "Modify Connection" : "Order Pathway"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Facility</label>
                    <select required value={formData.datacenterId} onChange={(e) => setFormData({ ...formData, datacenterId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none">
                      <option value="">Select Facility...</option>
                      {datacenters.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Customer Entity</label>
                    <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} disabled={!isInternalAdmin} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none disabled:opacity-50">
                      <option value="">Infrastructure Internal</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transmission Media</label>
                    <select required value={formData.mediaType} onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none">
                      <option value="Singlemode Fiber">Singlemode Fiber (SMF)</option>
                      <option value="Multimode Fiber">Multimode Fiber (MMF)</option>
                      <option value="UTP Cat6">UTP Cat6</option>
                      <option value="UTP Cat6a">UTP Cat6a</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {/* SIDE A */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center text-xs font-black text-indigo-400 border border-indigo-500/20">A</div>
                        <span className="text-sm font-bold text-slate-300">Side A Config</span>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Company Name</label>
                          <input type="text" placeholder="Owner of Side A..." value={formData.sideACompany} onChange={(e) => setFormData({ ...formData, sideACompany: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Rack Selection</label>
                          <select required value={formData.sideARackId} onChange={(e) => setFormData({ ...formData, sideARackId: e.target.value, sideAEquipmentId: "", sideAPortId: "" })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none">
                            <option value="">Select Rack...</option>
                            {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Equipment</label>
                            <select required disabled={!formData.sideARackId} value={formData.sideAEquipmentId} onChange={(e) => setFormData({ ...formData, sideAEquipmentId: e.target.value, sideAPortId: "" })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none disabled:opacity-30">
                              <option value="">Select...</option>
                              {racks.find(r => r.id === parseInt(formData.sideARackId))?.equipments?.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Port</label>
                            <select required disabled={!formData.sideAEquipmentId} value={formData.sideAPortId} onChange={(e) => setFormData({ ...formData, sideAPortId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none disabled:opacity-30">
                              <option value="">Select...</option>
                              {racks.find(r => r.id === parseInt(formData.sideARackId))?.equipments?.find((eq: any) => eq.id === parseInt(formData.sideAEquipmentId))?.ports?.map((p: any) => <option key={p.id} value={p.id}>{p.portName}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SIDE Z */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 justify-end text-right">
                        <span className="text-sm font-bold text-slate-300">Side Z Config</span>
                        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-400 border border-emerald-500/20">Z</div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 font-bold uppercase">Company Name</label>
                          <input type="text" placeholder="Owner of Side Z..." value={formData.sideZCompany} onChange={(e) => setFormData({ ...formData, sideZCompany: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none text-right" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 font-bold uppercase text-right block">Rack Selection</label>
                          <select required value={formData.sideZRackId} onChange={(e) => setFormData({ ...formData, sideZRackId: e.target.value, sideZEquipmentId: "", sideZPortId: "" })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none text-right">
                            <option value="">Select Rack...</option>
                            {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase text-right block">Equipment</label>
                            <select required disabled={!formData.sideZRackId} value={formData.sideZEquipmentId} onChange={(e) => setFormData({ ...formData, sideZEquipmentId: e.target.value, sideZPortId: "" })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none text-right disabled:opacity-30">
                              <option value="">Select...</option>
                              {racks.find(r => r.id === parseInt(formData.sideZRackId))?.equipments?.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase text-right block">Port</label>
                            <select required disabled={!formData.sideZEquipmentId} value={formData.sideZPortId} onChange={(e) => setFormData({ ...formData, sideZPortId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none text-right disabled:opacity-30">
                              <option value="">Select...</option>
                              {racks.find(r => r.id === parseInt(formData.sideZRackId))?.equipments?.find((eq: any) => eq.id === parseInt(formData.sideZEquipmentId))?.ports?.map((p: any) => <option key={p.id} value={p.id}>{p.portName}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-xl"><ArrowRightLeft className="w-5 h-5" /></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Discard</button>
                  <button type="submit" className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                    {formData.id ? "Apply Changes" : "Commit Pathway"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
