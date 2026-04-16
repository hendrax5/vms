'use client';

import { Activity, Network, Database, Calendar, Server, Cable, Box, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Sub-components
import TenantAccess from './TenantAccess';
import TenantColocation from './TenantColocation';
import TenantInterconnection from './TenantInterconnection';

export default function TenantDashboard() {
    const { data: session } = useSession();
    
    // Tab Router State
    const [activeModule, setActiveModule] = useState<'OVERVIEW' | 'COLOCATION' | 'INTERCONNECTION' | 'ACCESS'>('OVERVIEW');

    // Live Dynamic Data
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [crossConnects, setCrossConnects] = useState<any[]>([]);
    const [permits, setPermits] = useState<any[]>([]);
    const [goods, setGoods] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const customerId = (session?.user as any)?.customerId;

    const fetchDashboardData = async () => {
        if (!customerId) return;
        setLoadingData(true);
        try {
            const [eqRes, ccRes, prmRes, gdsRes, dcRes] = await Promise.all([
                fetch(`/api/racks/equipments?customerId=${customerId}`),
                fetch(`/api/cross-connects?customerId=${customerId}`),
                fetch(`/api/permits?customerId=${customerId}`),
                fetch(`/api/goods`), // Note: In future modify to support customerId 
                fetch('/api/datacenters')
            ]);
            
            if (eqRes.ok) setEquipments(await eqRes.json());
            if (ccRes.ok) setCrossConnects(await ccRes.json());
            if (prmRes.ok) setPermits(await prmRes.json());
            if (gdsRes.ok) setGoods(await gdsRes.json());
            if (dcRes.ok) setDatacenters(await dcRes.json());

        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [customerId]);

    const tenantStats = [
        { name: 'Colocation', value: equipments.length.toString(), change: 'Provisioned Assets', icon: Database, color: 'text-red-500', action: () => setActiveModule('COLOCATION') },
        { name: 'Interconnection', value: crossConnects.length.toString(), change: 'Active Circuits', icon: Network, color: 'text-red-500', action: () => setActiveModule('INTERCONNECTION') },
        { name: 'Access & Logistics', value: permits.filter(p => p.status === 'Pending' || p.status === 'Approved').length.toString(), change: 'Pending Visits', icon: ShieldAlert, color: 'text-red-500', action: () => setActiveModule('ACCESS') },
        { name: 'Platform SLA', value: '99.99%', change: 'All systems nominal', icon: Activity, color: 'text-red-500', action: () => {} },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto font-sans">
            {/* Header Equinix Style */}
            <div className="border-b border-slate-700 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">
                        Customer Portal
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm font-semibold tracking-wide uppercase">Enterprise Infrastructure Management</p>
                </div>
            </div>

            {/* Industrial Navigation Bar */}
            <div className="flex space-x-1 border-b border-slate-800 bg-slate-900/50 p-1">
                 {['OVERVIEW', 'COLOCATION', 'INTERCONNECTION', 'ACCESS'].map(mod => (
                      <button 
                         key={mod}
                         onClick={() => setActiveModule(mod as any)}
                         className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-sm ${activeModule === mod ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                      >
                          {mod}
                      </button>
                 ))}
            </div>

            {loadingData ? (
                <div className="py-24 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Facility Data</p>
                </div>
            ) : (
                <div className="min-h-[500px]">
                    {/* OVERVIEW MODULE */}
                    {activeModule === 'OVERVIEW' && (
                        <div className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {tenantStats.map((stat, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1, duration: 0.3 }}
                                        key={stat.name} 
                                        onClick={stat.action}
                                        className="bg-slate-900 border border-slate-800 p-6 relative overflow-hidden group hover:border-red-500 transition-colors cursor-pointer rounded-sm"
                                    >
                                        <div className="flex items-start justify-between z-10 relative">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.name}</p>
                                                <p className="text-4xl font-black text-slate-100">{stat.value}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-2">{stat.change}</p>
                                            </div>
                                            <div className="w-10 h-10 bg-slate-950 border border-slate-800 flex items-center justify-center rounded-sm">
                                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                            </div>
                                        </div>
                                        {/* Accent bar bottom */}
                                        <div className="absolute bottom-0 left-0 h-1 w-0 bg-red-600 transition-all duration-300 group-hover:w-full"></div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            <div className="mt-8 bg-slate-900 border border-slate-800 p-8 text-center rounded-sm">
                                 <h2 className="text-lg font-bold text-white uppercase tracking-widest">Equinix-Style Enterprise Portal</h2>
                                 <p className="text-sm text-slate-500 max-w-2xl mx-auto mt-2">Navigate using the top tabs to visualize your Colocation assets, manage Interconnections, and schedule Datacenter security visits with QR badges.</p>
                            </div>
                        </div>
                    )}

                    {/* COLOCATION MODULE */}
                    {activeModule === 'COLOCATION' && (
                        <TenantColocation equipments={equipments} />
                    )}

                    {/* INTERCONNECTION MODULE */}
                    {activeModule === 'INTERCONNECTION' && (
                        <TenantInterconnection 
                            crossConnects={crossConnects} 
                            datacenters={datacenters}
                            equipments={equipments}
                            customerId={customerId}
                            onRefresh={fetchDashboardData}
                        />
                    )}

                    {/* ACCESS MODULE */}
                    {activeModule === 'ACCESS' && (
                        <TenantAccess permits={permits} goods={goods} customerId={customerId} datacenters={datacenters} equipments={equipments} onRefresh={fetchDashboardData} />
                    )}
                </div>
            )}
        </div>
    );
}
