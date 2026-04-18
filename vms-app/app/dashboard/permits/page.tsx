'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PermitTable from '../../components/dashboard/PermitTable';
import CreatePermitModal from '../../components/dashboard/CreatePermitModal';
import PermitDetailModal from '../../components/dashboard/PermitDetailModal';
import AssignCardModal from '../../components/dashboard/AssignCardModal';

import { Search, Plus } from 'lucide-react';

export default function PermitsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const userRoleLower = (session?.user as any)?.role?.toLowerCase() || '';
    const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRoleLower);

    const [permits, setPermits] = useState<any[]>([]);
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [accessCards, setAccessCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'live' | 'archive'>('live');
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [selectedPermit, setSelectedPermit] = useState<any>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (session) {
            fetchAllData();
        }
    }, [session, status, activeTab]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [p, dc, c, ac] = await Promise.all([
                fetch(`/api/permits?view=${activeTab}`).then(res => res.json()),
                fetch('/api/datacenters').then(res => res.json()),
                fetch('/api/customers').then(res => res.json()),
                fetch('/api/access-cards').then(res => res.json())
            ]);
            setPermits(p); setDatacenters(dc); setCustomers(c); setAccessCards(ac);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            const res = await fetch('/api/permits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                const updated = await res.json();
                setPermits(prev => prev.map(p => p.id === id ? updated : p));
                if (selectedPermit?.id === id) setSelectedPermit(updated);
            }
        } catch (e) { console.error(e); }
    };

    const handleCreatePermit = async (formData: any) => {
        try {
            await fetch('/api/permits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            setIsCreateModalOpen(false);
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    const handleAssignCard = async (permitId: number, cardId: string) => {
        try {
            await fetch('/api/access-cards/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permitId, cardId })
            });
            setIsCardModalOpen(false);
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    const handleReleaseCard = async (cardId: string) => {
        try {
            await fetch('/api/access-cards/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId })
            });
            fetchAllData();
        } catch (e) { console.error(e); }
    };

    if (!isInternalAdmin) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">
                         {activeTab === 'live' ? 'Live Visit Permits' : 'Permit Archive & Logs'}
                     </h1>
                     <p className="text-muted-foreground mt-1">
                         {activeTab === 'live' 
                            ? 'Manage data center physical access requests in real-time.' 
                            : 'Review past visit records and audit logs for compliance.'}
                     </p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={fetchAllData} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold border border-slate-700 transition-all">Refresh</button>
                     <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all">
                         <Plus className="w-4 h-4" /> Create Request
                     </button>
                 </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('live')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'live' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Live Permits
                </button>
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'archive' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                    Archive & History
                </button>
            </div>

            <div className="bg-card/50 border border-border/50 rounded-2xl backdrop-blur-xl overflow-hidden">
                 <div className="p-6 border-b border-border/50 flex items-center justify-between">
                     <div className="relative w-72">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <input type="text" placeholder="Search..." className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-100 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                     </div>
                 </div>
                 <PermitTable permits={permits} loading={loading} onViewDetail={setSelectedPermit} />
            </div>

            <CreatePermitModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreatePermit} datacenters={datacenters} customers={customers} isInternalAdmin={isInternalAdmin} />
            <PermitDetailModal 
                permit={selectedPermit} 
                onClose={() => setSelectedPermit(null)} 
                onUpdateStatus={handleUpdateStatus} 
                onAssignCard={() => setIsCardModalOpen(true)} 
                onReleaseCard={handleReleaseCard} 
                isInternalAdmin={isInternalAdmin} 
                assignedCard={accessCards.find(c => c.currentPermitId === selectedPermit?.id)}
            />
            <AssignCardModal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} onSubmit={handleAssignCard} targetPermit={selectedPermit} accessCards={accessCards} />
        </div>
    );
}
