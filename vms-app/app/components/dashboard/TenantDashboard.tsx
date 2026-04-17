'use client';

import { Activity, Network, Database, Calendar, Server, Cable, Box, ShieldAlert, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Sub-components
import TenantAccess from './TenantAccess';
import TenantColocation from './TenantColocation';
import TenantInterconnection from './TenantInterconnection';
import TenantAudit from './TenantAudit';

export default function TenantDashboard() {
    const { data: session } = useSession();
    
    // Tab Router State
    const [activeModule, setActiveModule] = useState<'OVERVIEW' | 'COLOCATION' | 'INTERCONNECTION' | 'ACCESS' | 'AUDIT'>('OVERVIEW');

    // Live Dynamic Data
    const [datacenters, setDatacenters] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<any[]>([]);
    const [crossConnects, setCrossConnects] = useState<any[]>([]);
    const [permits, setPermits] = useState<any[]>([]);
    const [goods, setGoods] = useState<any[]>([]);
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const customerId = (session?.user as any)?.customerId;

    const fetchDashboardData = async () => {
        if (!customerId) return;
        setLoadingData(true);
        try {
            const [eqRes, ccRes, prmRes, gdsRes, dcRes, usersRes] = await Promise.all([
                fetch(`/api/racks/equipments?customerId=${customerId}`),
                fetch(`/api/cross-connects?customerId=${customerId}`),
                fetch(`/api/permits?customerId=${customerId}`),
                fetch(`/api/goods?customerId=${customerId}`), 
                fetch('/api/datacenters'),
                fetch(`/api/customers/${customerId}/users`)
            ]);
            
            if (eqRes.ok) setEquipments(await eqRes.json());
            if (ccRes.ok) setCrossConnects(await ccRes.json());
            if (prmRes.ok) setPermits(await prmRes.json());
            if (gdsRes.ok) setGoods(await gdsRes.json());
            if (dcRes.ok) setDatacenters(await dcRes.json());
            if (usersRes.ok) setTenantUsers(await usersRes.json());

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
        { name: 'Colocation', value: equipments.length.toString(), change: 'Provisioned Assets', icon: Database, color: 'text-emerald-500', action: () => setActiveModule('COLOCATION') },
        { name: 'Interconnection', value: crossConnects.length.toString(), change: 'Active Circuits', icon: Network, color: 'text-emerald-500', action: () => setActiveModule('INTERCONNECTION') },
        { name: 'Access & Logistics', value: permits.filter(p => p.status === 'Pending' || p.status === 'Approved').length.toString(), change: 'Pending Visits', icon: ShieldAlert, color: 'text-emerald-500', action: () => setActiveModule('ACCESS') },
        { name: 'Activity Audit', value: permits.filter(p => p.status === 'CheckIn').length.toString(), change: 'Total Logged Visits', icon: History, color: 'text-emerald-500', action: () => setActiveModule('AUDIT') },
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

            {/* Bento Navigation Bar */}
            <div className="flex flex-wrap gap-2 border border-white/10 bg-slate-900/40 backdrop-blur-2xl p-2 rounded-2xl">
                 {['OVERVIEW', 'COLOCATION', 'INTERCONNECTION', 'ACCESS', 'AUDIT'].map(mod => (
                      <button 
                         key={mod}
                         onClick={() => setActiveModule(mod as any)}
                         className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${activeModule === mod ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                      >
                          {mod}
                      </button>
                 ))}
            </div>

            {loadingData ? (
                <div className="py-24 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
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
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        transition={{ delay: i * 0.1, type: "spring", stiffness: 100, damping: 20 }}
                                        key={stat.name} 
                                        onClick={stat.action}
                                        className="bg-slate-900/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8 backdrop-blur-2xl relative overflow-hidden group transition-colors cursor-pointer group-hover:border-white/20"
                                    >
                                        <div className="flex items-start justify-between z-10 relative">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.name}</p>
                                                <p className="text-4xl font-bold text-slate-100 font-mono tracking-tight">{stat.value}</p>
                                                <p className="text-xs font-semibold text-slate-400 mt-2">{stat.change}</p>
                                            </div>
                                            <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl">
                                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                            </div>
                                        </div>
                                        {/* Accent bar bottom */}
                                        <div className="absolute bottom-0 left-0 h-1 w-0 bg-emerald-600 transition-all duration-300 group-hover:w-full rounded-b-3xl"></div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            <div className="mt-8 bg-slate-900/40 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8 text-center backdrop-blur-2xl">
                                 <h2 className="text-lg font-bold text-white uppercase tracking-widest">Enterprise Datacenter Portal</h2>
                                 <p className="text-sm text-slate-500 max-w-2xl mx-auto mt-2">Navigate using the top tabs to visualize your Colocation assets, manage Interconnections, and schedule Datacenter security visits with QR badges.</p>
                            </div>
                        </div>
                    )}

                    {/* COLOCATION MODULE */}
                    {activeModule === 'COLOCATION' && (
                        <TenantColocation equipments={equipments} onRefresh={fetchDashboardData} />
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
                        <TenantAccess permits={permits} goods={goods} customerId={customerId} datacenters={datacenters} equipments={equipments} tenantUsers={tenantUsers} onRefresh={fetchDashboardData} />
                    )}

                    {/* AUDIT MODULE */}
                    {activeModule === 'AUDIT' && (
                        <TenantAudit permits={permits} goods={goods} />
                    )}
                </div>
            )}
        </div>
    );
}
