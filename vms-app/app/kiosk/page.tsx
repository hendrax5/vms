'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, CheckCircle2, LogOut, UserX, AlertTriangle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QRScanner from '../components/kiosk/QRScanner';
import CameraCapture from '../components/kiosk/CameraCapture';

type KioskStep = 'IDLE' | 'CAMERA' | 'PROCESSING' | 'SUCCESS_IN' | 'SUCCESS_OUT' | 'ERROR';

export default function DatacenterKiosk() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<KioskStep>('IDLE');
    const [scannedToken, setScannedToken] = useState('');
    const [manualToken, setManualToken] = useState('');
    const [visitorName, setVisitorName] = useState('');
    const [allVisitors, setAllVisitors] = useState<string[]>([]);
    const [currentVisitorIndex, setCurrentVisitorIndex] = useState(0);
    const [visitorPhotos, setVisitorPhotos] = useState<Record<string, string>>({});
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?callbackUrl=/kiosk');
    }, [status, router]);

    useEffect(() => {
        if (['SUCCESS_IN', 'SUCCESS_OUT', 'ERROR'].includes(step)) {
            const timer = setTimeout(() => resetKiosk(), 6000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const resetKiosk = () => {
        setStep('IDLE');
        setScannedToken('');
        setVisitorName('');
        setAllVisitors([]);
        setCurrentVisitorIndex(0);
        setVisitorPhotos({});
        setErrorMessage('');
    };

    const handleQRScanned = async (token: string) => {
        setScannedToken(token);
        setStep('PROCESSING');
        try {
            const res = await fetch('/api/permits/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: token, validateOnly: true })
            });
            const data = await res.json();
            
            if (data.isCheckoutNeeded) {
                await processCheckOut(token);
            } else if (res.ok) {
                const names = data.visitorNames.split(',').map((n: string) => n.trim());
                setAllVisitors(names);
                setVisitorName(names[0]);
                setStep('CAMERA');
            } else {
                setErrorMessage(data.error || 'Invalid QR Code');
                setStep('ERROR');
            }
        } catch (err) {
            setErrorMessage('Network error');
            setStep('ERROR');
        }
    };

    const handlePhotoCaptured = (photoData: string) => {
        const newPhotos = { ...visitorPhotos, [allVisitors[currentVisitorIndex]]: photoData };
        setVisitorPhotos(newPhotos);

        if (currentVisitorIndex < allVisitors.length - 1) {
            const nextIndex = currentVisitorIndex + 1;
            setCurrentVisitorIndex(nextIndex);
            setVisitorName(allVisitors[nextIndex]);
        } else {
            finalizeCheckIn(newPhotos);
        }
    };

    const finalizeCheckIn = async (photos: Record<string, string>) => {
        setStep('PROCESSING');
        try {
            const res = await fetch('/api/permits/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: scannedToken, visitorPhoto: JSON.stringify(photos) })
            });
            if (res.ok) setStep('SUCCESS_IN');
            else {
                const data = await res.json();
                setErrorMessage(data.error || 'Submission failed');
                setStep('ERROR');
            }
        } catch (err) {
            setErrorMessage('Network error');
            setStep('ERROR');
        }
    };

    const processCheckOut = async (token: string) => {
        setStep('PROCESSING');
        try {
            const res = await fetch('/api/permits/check-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: token })
            });
            const data = await res.json();
            if (res.ok) {
                setVisitorName(data.visitor);
                setStep('SUCCESS_OUT');
            } else {
                setErrorMessage(data.error);
                setStep('ERROR');
            }
        } catch (err) {
            setErrorMessage('Network error');
            setStep('ERROR');
        }
    };

    if (status !== 'authenticated') return null;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
            
            <header className="mb-12 text-center space-y-2">
                <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">VMS Terminal</h1>
                <p className="text-blue-400 font-mono text-sm tracking-widest uppercase opacity-60">Secure Kiosk Interface v5.0</p>
            </header>

            <main className="w-full max-w-4xl z-10">
                <AnimatePresence mode="wait">
                    {step === 'IDLE' && (
                        <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="grid md:grid-cols-2 gap-8 items-center bg-slate-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">
                            <div className="space-y-6">
                                <h2 className="text-5xl font-black text-white leading-tight">Welcome.<br/><span className="text-blue-500">Scan QR.</span></h2>
                                <p className="text-slate-400 text-lg">Position your permit or equipment QR code within the frame to begin verification.</p>
                                <form onSubmit={(e) => { e.preventDefault(); handleQRScanned(manualToken); }} className="flex gap-2">
                                    <input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Manual Code..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    <button className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl transition-all"><ChevronRight /></button>
                                </form>
                            </div>
                            <QRScanner onScanSuccess={handleQRScanned} />
                        </motion.div>
                    )}

                    {step === 'CAMERA' && (
                        <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-8 bg-slate-900/50 backdrop-blur-xl border border-blue-500/20 p-10 rounded-3xl shadow-2xl">
                            <div className="space-y-2">
                                <span className="text-blue-400 font-mono text-xs tracking-widest uppercase">Subject {currentVisitorIndex + 1} of {allVisitors.length}</span>
                                <h2 className="text-3xl font-bold text-white">Biometric Verification</h2>
                                <p className="text-slate-400 italic">Please take a clear photo of <span className="text-blue-400 font-bold not-italic">{visitorName}</span></p>
                            </div>
                            <CameraCapture onCapture={handlePhotoCaptured} />
                        </motion.div>
                    )}

                    {step === 'PROCESSING' && (
                        <motion.div key="proc" className="flex flex-col items-center py-20 space-y-6">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Authorizing...</h2>
                        </motion.div>
                    )}

                    {step === 'SUCCESS_IN' && (
                        <motion.div key="success_in" className="text-center space-y-8 bg-emerald-950/20 border border-emerald-500/30 p-16 rounded-3xl backdrop-blur-xl">
                            <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto" />
                            <h2 className="text-5xl font-black text-white">Verified!</h2>
                            <p className="text-emerald-200 text-xl">Please collect your <span className="font-bold text-white">Access Card</span> from the NOC team.</p>
                        </motion.div>
                    )}

                    {step === 'SUCCESS_OUT' && (
                        <motion.div key="success_out" className="text-center space-y-8 bg-amber-950/20 border border-amber-500/30 p-16 rounded-3xl backdrop-blur-xl">
                            <LogOut className="w-24 h-24 text-amber-400 mx-auto" />
                            <h2 className="text-5xl font-black text-white">Checked Out!</h2>
                            <p className="text-amber-200 text-xl">Thank you for visiting. Please return your card to Security.</p>
                        </motion.div>
                    )}

                    {step === 'ERROR' && (
                        <motion.div key="error" className="text-center space-y-8 bg-red-950/20 border border-red-500/30 p-16 rounded-3xl backdrop-blur-xl">
                            <UserX className="w-24 h-24 text-red-400 mx-auto" />
                            <h2 className="text-4xl font-black text-white uppercase">Auth Error</h2>
                            <p className="text-red-200 text-xl">{errorMessage}</p>
                            <button onClick={resetKiosk} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all">Dismiss</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="mt-12 opacity-30 font-mono text-[10px] tracking-tighter">SECURE KIOSK OS V5.0 // END-TO-END ENCRYPTED</footer>
        </div>
    );
}
