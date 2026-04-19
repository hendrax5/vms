'use client';

import { Search, Plus, LayoutGrid, List } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import RackCard from '../../components/dashboard/racks/RackCard';
import RackList from '../../components/dashboard/racks/RackList';
import AddRackModal from '../../components/dashboard/racks/AddRackModal';
import EditRackModal from '../../components/dashboard/racks/EditRackModal';
import DeleteRackModal from '../../components/dashboard/racks/DeleteRackModal';

export default function RacksPage() {
    const [racks, setRacks] = useState<any[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const itemsPerPage = 10;

    useEffect(() => {
        const savedView = localStorage.getItem('rackViewMode');
        if (savedView === 'grid' || savedView === 'list') setViewMode(savedView);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [racksRes, rowsRes] = await Promise.all([
                fetch('/api/racks'), fetch('/api/rows')
            ]);
            if (racksRes.ok) setRacks(await racksRes.json());
            if (rowsRes.ok) setRows(await rowsRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleAddRack = async (formData: any) => {
        setSaving(true);
        try {
            const res = await fetch('/api/racks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
                toast.success('Rack provisioned successfully');
            } else toast.error('Failed to add rack');
        } catch (e) { toast.error('An error occurred.'); }
        setSaving(false);
    };

    const handleEditRack = async (formData: any) => {
        setSaving(true);
        try {
            const res = await fetch('/api/racks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setEditTarget(null);
                fetchData();
                toast.success('Rack updated successfully');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update rack');
            }
        } catch (e) { toast.error('An error occurred.'); }
        setSaving(false);
    };

    const handleDeleteRack = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/racks?id=${deleteTarget}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteTarget(null);
                fetchData();
                toast.success('Rack decommissioned successfully');
            } else toast.error('Failed to delete rack');
        } catch (e) { console.error(e); }
    };

    const filteredRacks = racks.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              r.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              r.rowName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLoc = selectedLocation === 'All Locations' || r.siteName === selectedLocation;
        return matchesSearch && matchesLoc;
    });

    const paginatedRacks = filteredRacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredRacks.length / itemsPerPage) || 1;
    const uniqueLocations = Array.from(new Set(racks.map(r => r.siteName).filter(Boolean))) as string[];

    return (
        <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-bold tracking-tight text-slate-100">Rack Inventory</h1>
                     <p className="text-muted-foreground mt-1">U-Space allocation monitoring and spatial collision tracking.</p>
                 </div>
                 <div className="flex items-center gap-3">
                     <div className="relative">
                         <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                         <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
                     </div>
                     <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200">
                         <option value="All Locations">All Locations</option>
                         {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                     </select>
                     <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                         <button onClick={() => { setViewMode('grid'); localStorage.setItem('rackViewMode', 'grid'); }} className={`p-2.5 ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
                         <button onClick={() => { setViewMode('list'); localStorage.setItem('rackViewMode', 'list'); }} className={`p-2.5 ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
                     </div>
                     <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20"><Plus className="w-4 h-4" /> Add Rack</button>
                 </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400">Loading live rack data...</div>
            ) : filteredRacks.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No racks match your search criteria.</div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {paginatedRacks.map((rack, i) => <RackCard key={rack.id} rack={rack} index={i} onDelete={setDeleteTarget} onEdit={setEditTarget} />)}
                </div>
            ) : (
                <RackList racks={paginatedRacks} onDelete={setDeleteTarget} onEdit={setEditTarget} />
            )}

            {totalPages > 1 && (
                 <div className="flex items-center justify-between mt-8 border-t border-slate-800/50 pt-6">
                      <p className="text-sm text-slate-400">Showing <span className="text-slate-200 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-200 font-medium">{Math.min(currentPage * itemsPerPage, filteredRacks.length)}</span> of <span className="text-slate-200">{filteredRacks.length}</span> racks</p>
                      <div className="flex gap-2">
                          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50">Previous</button>
                          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50">Next</button>
                      </div>
                 </div>
            )}

            <AddRackModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleAddRack} rows={rows} saving={saving} />
            <EditRackModal isOpen={!!editTarget} onClose={() => setEditTarget(null)} onSubmit={handleEditRack} rack={editTarget} saving={saving} />
            <DeleteRackModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteRack} />
        </div>
    );
}
