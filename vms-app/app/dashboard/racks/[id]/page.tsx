'use client';

import { ArrowLeft, LayoutTemplate, Plus, Eye, RotateCw, ArrowRightLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RackElevation from '../../../components/dashboard/racks/details/RackElevation';
import EquipmentInventory from '../../../components/dashboard/racks/details/EquipmentInventory';
import RackAuditTrail from '../../../components/dashboard/racks/details/RackAuditTrail';
import PortModal from '../../../components/dashboard/racks/details/PortModal';
import DeviceModal from '../../../components/dashboard/racks/details/DeviceModal';
import CreateCrossConnectModal from '../../../components/dashboard/racks/details/CreateCrossConnectModal';

export default function RackElevationPage() {
    const params = useParams();
    const router = useRouter();
    const rackId = params.id as string;
    const { data: session } = useSession();

    const [rack, setRack] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [perspective, setPerspective] = useState<'FRONT' | 'REAR' | 'BOTH'>('FRONT');
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
    const [isEqModalOpen, setIsEqModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [draggedEq, setDraggedEq] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [bindPortTarget, setBindPortTarget] = useState<any>(null);

    const userRole = ((session?.user as any)?.role?.name || (session?.user as any)?.role || '').toLowerCase().replace(/\s+/g, '');
    const userCustomerId = (session?.user as any)?.customerId || null;
    const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
    const isTenantAdmin = ['tenantadmin', 'tenantstaff', 'customer'].includes(userRole);
    
    const canEdit = isInternalAdmin || (isTenantAdmin && rack && (rack.customerId === null || Number(rack.customerId) === Number(userCustomerId)));

    useEffect(() => { fetchData(); }, [rackId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const promises: any[] = [
                fetch(`/api/racks/${rackId}`).then(res => res.json()),
                fetch(`/api/racks/${rackId}/audit`).then(res => res.json())
            ];
            if (isInternalAdmin) {
                promises.push(fetch('/api/customers').then(res => res.json()));
            }
            const results = await Promise.all(promises);
            setRack(results[0]); 
            setAuditLogs(results[1]);
            if (isInternalAdmin && results[2]) {
                setCustomers(results[2]);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSaveEq = async (data: any) => {
        const url = data.id ? `/api/racks/equipments/${data.id}` : '/api/racks/equipments';
        try {
            const res = await fetch(url, {
                method: data.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, rackId: parseInt(rackId) })
            });
            if (res.ok) { setIsEqModalOpen(false); fetchData(); }
            else alert('Error: ' + (await res.json()).error);
        } catch (e) { console.error(e); }
    };

    const handleDeleteEq = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            const res = await fetch(`/api/racks/equipments/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (e) { console.error(e); }
    };

    const handleDrop = async (e: React.DragEvent, targetU: number) => {
        e.preventDefault();
        if (!draggedEq || !canEdit) return;
        const size = draggedEq.uEnd - draggedEq.uStart + 1;
        const newUStart = targetU - size + 1;
        if (newUStart < 1 || targetU > (rack.uCapacity || 42)) return alert("Out of range");
        
        try {
            const res = await fetch(`/api/racks/equipments/${draggedEq.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uStart: newUStart, uEnd: targetU, rackId: rack.id })
            });
            if (res.ok) fetchData();
            else fetchData();
        } catch (e) { fetchData(); }
        setDraggedEq(null);
    };

    if (loading) return <div className="py-24 text-center text-slate-500 uppercase font-bold animate-pulse">Syncing Facility Data</div>;
    if (!rack) return <div className="text-center text-red-400 py-12">Failed to load rack data.</div>;

    const visibleEquipments = (rack.equipments || []).filter((eq: any) => {
        if (perspective === 'BOTH') return true;
        const o = eq.orientation || 'FRONT';
        return perspective === 'FRONT' ? (o === 'FRONT' || o === 'BOTH') : (o === 'BACK' || o === 'BOTH');
    }).map((eq: any) => ({ ...eq, isMine: isInternalAdmin || (userCustomerId !== null && (Number(eq.customerId) === Number(userCustomerId) || (eq.customerId === null && eq.equipmentType !== 'PATCH_PANEL'))) }));

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <button onClick={() => router.push('/dashboard/racks')} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Fleet
            </button>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-white uppercase flex items-center gap-3"><LayoutTemplate className="w-8 h-8 text-emerald-500" />{rack.name}</h1>
                    <p className="text-slate-500 mt-1 text-xs font-bold tracking-[0.2em] uppercase">{rack.row?.room?.datacenter?.name} • Row {rack.row?.name}</p>
                </div>
                {canEdit && (
                    <button onClick={() => { setModalData(null); setIsEqModalOpen(true); }} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4" /> Install Device
                    </button>
                )}
            </div>

            <div className="flex gap-2 bg-slate-900/40 border border-white/10 p-2 rounded-2xl w-fit">
                {[ {id:'FRONT', label:'Front', icon:Eye}, {id:'REAR', label:'Rear', icon:RotateCw}, {id:'BOTH', label:'X-Ray', icon:ArrowRightLeft} ].map(p => (
                    <button key={p.id} onClick={() => setPerspective(p.id as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${perspective === p.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>
                        <p.icon className="w-3.5 h-3.5" /> {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <RackElevation 
                    totalU={rack.uCapacity || 42} 
                    uArray={Array.from({ length: rack.uCapacity || 42 }, (_, i) => (rack.uCapacity || 42) - i)} 
                    getEquipmentAtU={(u) => visibleEquipments.find((eq: any) => u >= eq.uStart && u <= eq.uEnd)} 
                    canEdit={canEdit} 
                    handleDragStart={(_, eq) => setDraggedEq(eq)} 
                    handleDragOver={(e) => e.preventDefault()} 
                    handleDrop={handleDrop} 
                />
                <div className="lg:col-span-3 space-y-8">
                    <EquipmentInventory visibleEquipments={visibleEquipments} canEdit={canEdit} onEdit={(eq) => { setModalData(eq); setIsEqModalOpen(true); }} onDelete={handleDeleteEq} onSelectPorts={setSelectedEquipment} userCustomerId={userCustomerId} />
                    <RackAuditTrail auditLogs={auditLogs} />
                </div>
            </div>

            <PortModal 
                isOpen={!!selectedEquipment} 
                onClose={() => setSelectedEquipment(null)} 
                selectedEquipment={selectedEquipment} 
                onBindPort={setBindPortTarget}
            />
            <DeviceModal 
                isOpen={isEqModalOpen} 
                onClose={() => setIsEqModalOpen(false)} 
                onSubmit={handleSaveEq} 
                initialData={modalData} 
                perspective={perspective} 
                isMmrRack={rack?.customerId === null}
                isInternalAdmin={isInternalAdmin}
                customers={customers}
            />
            <CreateCrossConnectModal
                isOpen={!!bindPortTarget}
                onClose={() => setBindPortTarget(null)}
                sourceEquipment={selectedEquipment}
                sourcePort={bindPortTarget}
                onSuccess={() => {
                    setBindPortTarget(null);
                    fetchData(); // Refresh to show active connection
                }}
            />
        </div>
    );
}
