'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Plus, QrCode, Download, Upload, Clock, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QrReaderComponent = ({ onScanSuccess }: { onScanSuccess: (text: string) => void }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
        let isScanned = false;
        scanner.render(
            (text) => {
                if (!isScanned) {
                    isScanned = true;
                    scanner.clear();
                    onScanSuccess(text);
                }
            },
            (error) => {} // Suppress errors during scan
        );
        return () => {
             scanner.clear().catch(e => console.log('Clear error:', e));
        };
    }, []);

    return <div id="qr-reader" className="w-full text-slate-800 rounded-lg overflow-hidden" />;
};

export default function GoodsPage() {
    const { data: session } = useSession();
    const isCustomer = (session?.user as any)?.role?.toLowerCase() === 'customer';

    const [goods, setGoods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isMyQrOpen, setIsMyQrOpen] = useState(false);

    useEffect(() => {
        fetchGoods();
    }, []);

    const fetchGoods = async () => {
        try {
            const res = await fetch('/api/goods');
            const data = await res.json();
            setGoods(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMockScan = async () => {
        try {
            const dummyItem = {
                name: 'Cisco Nexus Switch',
                description: 'Replacement unit for Rack B3',
                status: 'CheckedIn',
                qrCode: `QR-${Math.random().toString(36).substring(7).toUpperCase()}`,
                datacenterId: 1
            };
            await fetch('/api/goods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dummyItem)
            });
            setIsScannerOpen(false);
            fetchGoods();
        } catch (error) {
            console.error(error);
        }
    };

    const handleRealScan = async (scannedText: string) => {
        try {
            const item = {
                name: 'Scanned Delivery/Asset',
                description: 'Processed via Camera',
                status: 'CheckedIn',
                qrCode: scannedText,
                datacenterId: 1
            };
            await fetch('/api/goods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            setIsScannerOpen(false);
            fetchGoods();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-3xl font-extrabold text-white">Goods & Logistics</h1>
                     <p className="text-muted-foreground mt-1">Track inbound/outbound assets with QR Scanner</p>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={fetchGoods} className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg text-sm font-semibold border border-white/5 transition-all">
                         Refresh
                     </button>
                     <button 
                        onClick={() => window.open('/api/goods/export')}
                        className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg text-sm font-semibold border border-white/5 transition-all flex items-center gap-2"
                     >
                        <Download className="w-4 h-4" /> Export Excel
                     </button>
                     {isCustomer ? (
                         <button onClick={() => setIsMyQrOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                             <QrCode className="w-4 h-4" /> Show Delivery QR
                         </button>
                     ) : (
                         <button onClick={() => setIsScannerOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                             <QrCode className="w-4 h-4" /> Scan Item QR
                         </button>
                     )}
                 </div>
            </div>

            <div className="bg-card/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200">Asset Tracking History</h3>
                    <div className="relative w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <input 
                             type="text" 
                             placeholder="Search QR or name..." 
                             className="w-full bg-slate-950/50 border border-white/10 text-sm text-slate-200 rounded-lg pl-10 pr-4 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                         />
                     </div>
                </div>
                
                <div className="divide-y divide-white/5">
                    {loading ? (
                         <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                             <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
                             Loading goods data...
                         </div>
                    ) : goods.length === 0 ? (
                         <div className="p-12 text-center">
                             <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                             <p className="text-slate-400 font-medium">No items tracked yet.</p>
                             <p className="text-slate-500 text-sm">Scan an asset QR to begin logging</p>
                         </div>
                    ) : (
                        goods.map((item, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={item.id} 
                                className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center">
                                         {item.status === 'CheckedIn' || item.status === 'Inbound' ? (
                                             <Download className="w-5 h-5 text-emerald-400" />
                                         ) : item.status === 'Outbound' ? (
                                             <Upload className="w-5 h-5 text-amber-400" />
                                         ) : (
                                             <Package className="w-5 h-5 text-emerald-400" />
                                         )}
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-slate-200">{item.name}</p>
                                         <p className="text-xs font-mono text-slate-500 mt-0.5">{item.qrCode}</p>
                                     </div>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                     <div>
                                         <p className="text-xs text-slate-400">Status</p>
                                         <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 border border-white/10 text-slate-300">
                                            {item.status}
                                         </span>
                                     </div>
                                     <div>
                                         <p className="text-xs text-slate-400">Timestamp</p>
                                         <p className="text-sm text-slate-300 flex items-center gap-1.5 mt-1">
                                             <Clock className="w-3 h-3 text-slate-500" /> 
                                             {new Date(item.createdAt).toLocaleString()}
                                         </p>
                                     </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* QR Scanner Mock Modal */}
            <AnimatePresence>
                {isScannerOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center">
                                <QrCode className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">QR Scanner Online</h3>
                                <p className="text-sm text-slate-400 mb-6">Point your camera at the asset QR code to automatically check it into the datacenter log.</p>
                                
                                <div className="border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-950/50 mb-6 relative overflow-hidden">
                                    <QrReaderComponent onScanSuccess={handleRealScan} />
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setIsScannerOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleMockScan} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg">
                                        Manual Enter
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Customer Show QR Modal */}
            <AnimatePresence>
                {isMyQrOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]"
                        >
                            <div className="p-8 text-center bg-white">
                                <QrCode className="w-48 h-48 text-black mx-auto mb-6" />
                                <h3 className="text-xl font-extrabold text-black mb-1">Company Delivery ID</h3>
                                <p className="text-sm text-gray-500 mb-6 font-mono font-bold tracking-widest">
                                    {session?.user?.email?.toString().toUpperCase()}
                                </p>
                                
                                <div className="p-3 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 mb-6">
                                    Please show this screen to the Datacenter Security or NOC Logistics Team to process your goods entering the facility.
                                </div>

                                <button onClick={() => setIsMyQrOpen(false)} className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg">
                                    Close Screen
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
