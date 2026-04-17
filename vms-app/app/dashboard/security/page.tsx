'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, Users, Clock, ArrowRight, UserCheck, ScanLine, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecurityDashboard() {
    const [data, setData] = useState<any>({ activeVisitors: 0, escortsRequired: 0, activePermits: [], recentEvents: [] });
    const [loading, setLoading] = useState(true);
    const [qrInput, setQrInput] = useState('');
    const [scanState, setScanState] = useState<'idle'|'scanning'|'success'|'error'>('idle');
    const [scanMessage, setScanMessage] = useState('');

    const handleScanSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qrInput.trim()) return;
        
        setScanState('scanning');
        try {
            const res = await fetch('/api/permits/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: qrInput })
            });
            const result = await res.json();
            
            if (res.ok) {
                setScanState('success');
                setScanMessage(`Verified: ${result.visitor} cleared for entry.`);
                setQrInput('');
            } else {
                 setScanState('error');
                 setScanMessage(result.error || 'Invalid Token');
            }
        } catch (error) {
             setScanState('error');
             setScanMessage('Failed to connect to verification server');
        }
        
        // Return to idle after a few seconds
        setTimeout(() => setScanState('idle'), 5000);
    };

    useEffect(() => {
        const fetchSecurityData = async () => {
            try {
                const res = await fetch('/api/security');
                const json = await res.json();
                if (!json.error) {
                    setData(json);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchSecurityData();
        const interval = setInterval(fetchSecurityData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading && !data.recentEvents.length) return <div className="p-8 text-neutral-400 font-mono">Loading Security Telemetry...</div>;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                        Enterprise Security Operations
                    </h1>
                    <p className="text-neutral-400 mt-1">Real-time facility access intelligence & event stream.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-3 rounded-lg">
                            <Users className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{data.activeVisitors}</p>
                            <p className="text-xs text-neutral-400 font-medium">ACTIVE ON-SITE</p>
                        </div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="bg-orange-500/10 p-3 rounded-lg">
                            <UserCheck className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{data.escortsRequired}</p>
                            <p className="text-xs text-neutral-400 font-medium">ESCORTS REQUIRED</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Quick QR Scanner Bar */}
            <form onSubmit={handleScanSubmission} className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-4 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500 animate-pulse" />
                <div className="bg-emerald-500/10 p-3 rounded-xl ml-2">
                    <ScanLine className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="flex-1 w-full">
                    <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest mb-1">Physical QR Scanner</h3>
                    <input 
                        type="text" 
                        autoFocus
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="Focus cursor here and use barcode scanner..." 
                        className="w-full bg-black border border-neutral-800 text-neutral-100 rounded-lg px-4 py-3 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                        disabled={scanState === 'scanning'}
                    />
                </div>
                <div className="w-full md:w-64 shrink-0 flex items-center justify-center">
                    {scanState === 'idle' && <p className="text-xs text-neutral-500 text-center">Awaiting scan input...</p>}
                    {scanState === 'scanning' && <p className="text-xs text-blue-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying payload...</p>}
                    {scanState === 'success' && <p className="text-xs text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-2 rounded border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> {scanMessage}</p>}
                    {scanState === 'error' && <p className="text-xs text-red-400 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded border border-red-500/20"><XCircle className="w-4 h-4" /> {scanMessage}</p>}
                </div>
                <button type="submit" className="hidden">Submit</button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active Escort Tracking */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="border-b border-neutral-800 p-5 bg-neutral-900/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-400" /> Active Facility Permits
                            </h2>
                        </div>
                        <div className="p-0">
                            {data.activePermits.length === 0 ? (
                                <div className="p-8 text-center text-neutral-500">No active visitors currently on-site.</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-800 bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                                            <th className="p-4">Visitor</th>
                                            <th className="p-4">Company</th>
                                            <th className="p-4">Zone Access</th>
                                            <th className="p-4">Escort Needs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {data.activePermits.map((permit: any) => (
                                                <motion.tr 
                                                    key={permit.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                                                >
                                                    <td className="p-4 font-medium text-neutral-200">{permit.visitorNames}</td>
                                                    <td className="p-4 text-neutral-400">{permit.companyName}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            {permit.zoneAccess?.map((zone: string) => (
                                                                <span key={zone} className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded-full uppercase border border-blue-500/20">
                                                                    {zone}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {permit.requiresEscort ? (
                                                            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-md font-semibold border border-orange-500/20">
                                                                <ShieldAlert className="w-3.5 h-3.5" /> Escort Required
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500/70 text-xs font-medium px-2.5">
                                                                Unescorted Access
                                                            </span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Event Stream */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="border-b border-neutral-800 p-5 bg-neutral-900/80">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-emerald-400" /> Event Telemetry
                        </h2>
                    </div>
                    <div className="p-5 flex-1 overflow-y-auto max-h-[600px] space-y-4">
                        <AnimatePresence>
                            {data.recentEvents.map((event: any) => (
                                <motion.div 
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-neutral-900 border pl-3 border-neutral-800 rounded-lg p-3 relative"
                                >
                                    {/* Status Indicator Line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                                        event.status === 'CheckIn' ? 'bg-emerald-500' :
                                        event.status === 'NDASigned' ? 'bg-blue-500' :
                                        event.status === 'KioskVerified' ? 'bg-indigo-500' :
                                        'bg-orange-500'
                                    }`} />
                                    
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-neutral-200 text-sm">{event.permit.visitorNames}</p>
                                        <span className="text-[10px] text-neutral-500 font-mono">
                                            {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">{event.message}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                                            {event.status}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {data.recentEvents.length === 0 && (
                            <p className="text-neutral-500 text-sm text-center py-8">Awaiting security events...</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
