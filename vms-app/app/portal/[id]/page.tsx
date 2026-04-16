'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
// A mock standalone page for external visitors to sign NDAs and view QR codes.

export default function PortalPage() {
    const params = useParams();
    const permitId = params.id as string;
    const [permitData, setPermitData] = useState<any>(null);
    const [signed, setSigned] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock fetch based on ID - in a real scenario we use a dedicated GET endpoint or SSR
        const fetchDetails = async () => {
            // For now, let's just mock data if not fetching
            setPermitData({
                id: permitId,
                companyName: "Acme Corp",
                activity: "Server Maintenance",
                status: "Approved",
                qrCodeToken: null
            });
            setLoading(false);
        };
        fetchDetails();
    }, [permitId]);

    const handleSignNDA = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/permits/${permitId}/nda`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consent: true })
            });
            const data = await res.json();
            if (data.success) {
                setSigned(true);
                setPermitData({ ...permitData, qrCodeToken: data.qrToken, status: 'NDASigned' });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !permitData) return <div className="h-screen w-full flex items-center justify-center text-slate-400">Verifying Ticket...</div>;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
                
                <div className="text-center mb-8">
                    <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white tracking-tight">VMS Data Center Portal</h1>
                    <p className="text-slate-400 text-sm mt-2">Facility Access Pass for {permitData.companyName}</p>
                </div>

                {!signed && !permitData.qrCodeToken ? (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-2">
                                <FileCheck className="w-4 h-4 text-emerald-400" /> NDA & Safety Policy
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                By proceeding, you agree to adhere to all data center strict security policies. Photography, tailgating, and unauthorized access to restricted zones are strictly prohibited.
                            </p>
                        </div>
                        
                        <button 
                            onClick={handleSignNDA}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'I Agree & Generate Pass'}
                        </button>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center space-y-6"
                    >
                        <div className="bg-white p-6 rounded-2xl mx-auto inline-block border-4 border-emerald-500/20">
                            <QrCode className="w-48 h-48 text-slate-900" />
                        </div>
                        <div>
                            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs items-center font-bold uppercase tracking-widest border border-emerald-500/20">
                                Identity Verified
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            Please present this QR code to the physical turnstile or security guard at check-in.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
