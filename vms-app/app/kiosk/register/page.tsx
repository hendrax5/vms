'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, CheckCircle2, UserX, User, Building, Briefcase, Users, Camera, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CameraCapture from '../../components/kiosk/CameraCapture';

type RegisterStep = 'FORM' | 'CAMERA' | 'PROCESSING' | 'SUCCESS_IN' | 'ERROR';

export default function DatacenterKioskRegister() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<RegisterStep>('FORM');
    const [visitorName, setVisitorName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [activity, setActivity] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const [customers, setCustomers] = useState<any[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successToken, setSuccessToken] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login?callbackUrl=/kiosk/register');
        
        if (status === 'authenticated') {
            // Fetch customers for the dropdown
            fetch('/api/customers')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setCustomers(data);
                    }
                })
                .catch(err => console.error("Failed to load customers", err));
        }
    }, [status, router]);

    useEffect(() => {
        if (['SUCCESS_IN', 'ERROR'].includes(step)) {
            const timer = setTimeout(() => resetKiosk(), 8000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const resetKiosk = () => {
        setStep('FORM');
        setVisitorName('');
        setCompanyName('');
        setActivity('');
        setCustomerId('');
        setErrorMessage('');
        setSuccessToken('');
        router.push('/kiosk');
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitorName || !activity) {
            setErrorMessage('Name and Purpose are required.');
            return;
        }
        setErrorMessage('');
        setStep('CAMERA');
    };

    const handlePhotoCaptured = async (photoData: string) => {
        setStep('PROCESSING');
        try {
            const res = await fetch('/api/kiosk/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    visitorName, 
                    companyName, 
                    activity, 
                    customerId: customerId || null,
                    visitorPhoto: photoData 
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                setSuccessToken(data.qrToken);
                setStep('SUCCESS_IN');
            } else {
                setErrorMessage(data.error || 'Registration failed');
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
            
            <header className="mb-8 text-center space-y-2 relative z-10">
                <button onClick={() => router.push('/kiosk')} className="absolute -left-20 top-4 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">Walk-In Registration</h1>
                <p className="text-blue-400 font-mono text-sm tracking-widest uppercase opacity-60">Visitor Management System</p>
            </header>

            <main className="w-full max-w-2xl z-10">
                <AnimatePresence mode="wait">
                    {step === 'FORM' && (
                        <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl">
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                {errorMessage && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-medium text-center">
                                        {errorMessage}
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input 
                                                required
                                                type="text" 
                                                value={visitorName} 
                                                onChange={(e) => setVisitorName(e.target.value)} 
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Company / Organization</label>
                                        <div className="relative">
                                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input 
                                                type="text" 
                                                value={companyName} 
                                                onChange={(e) => {
                                                    setCompanyName(e.target.value);
                                                    setCustomerId('');
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                                                placeholder="Enter or search company / tenant name"
                                            />
                                        </div>
                                        {/* Dropdown Suggestions */}
                                        <AnimatePresence>
                                            {showSuggestions && companyName.length > 0 && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -5 }} 
                                                    animate={{ opacity: 1, y: 0 }} 
                                                    exit={{ opacity: 0, y: -5 }} 
                                                    className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                                                >
                                                    {customers.filter(c => (c.name || '').toLowerCase().includes((companyName || '').toLowerCase())).length > 0 ? (
                                                        customers.filter(c => (c.name || '').toLowerCase().includes((companyName || '').toLowerCase())).map(customer => (
                                                            <div 
                                                                key={customer.id} 
                                                                onClick={() => {
                                                                    setCompanyName(customer.name);
                                                                    setCustomerId(customer.id);
                                                                    setShowSuggestions(false);
                                                                }}
                                                                className="px-4 py-3 hover:bg-blue-600 cursor-pointer text-sm text-slate-200 transition-colors flex items-center gap-3"
                                                            >
                                                                <Users className="w-4 h-4 opacity-50" />
                                                                {customer.name}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-slate-500 italic">No registered tenant found. Will register as a new external company.</div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Purpose of Visit</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                            <textarea 
                                                required
                                                value={activity} 
                                                onChange={(e) => setActivity(e.target.value)} 
                                                rows={3}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 resize-none" 
                                                placeholder="Briefly describe the purpose of your visit..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 group">
                                    Next Step <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'CAMERA' && (
                        <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-8 bg-slate-900/50 backdrop-blur-xl border border-blue-500/20 p-10 rounded-3xl shadow-2xl">
                            <div className="space-y-2">
                                <span className="text-blue-400 font-mono text-xs tracking-widest uppercase">Identity Verification</span>
                                <h2 className="text-3xl font-bold text-white">Biometric Capture</h2>
                                <p className="text-slate-400 italic">Please take a clear photo of your face for the visitor log.</p>
                            </div>
                            <CameraCapture onCapture={handlePhotoCaptured} />
                            <button onClick={() => setStep('FORM')} className="text-slate-500 hover:text-white text-sm font-medium transition-colors">Return to Form</button>
                        </motion.div>
                    )}

                    {step === 'PROCESSING' && (
                        <motion.div key="proc" className="flex flex-col items-center py-20 space-y-6">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Registering...</h2>
                            <p className="text-slate-400">Saving identity and biometric data.</p>
                        </motion.div>
                    )}

                    {step === 'SUCCESS_IN' && (
                        <motion.div key="success_in" className="text-center space-y-8 bg-emerald-950/20 border border-emerald-500/30 p-16 rounded-3xl backdrop-blur-xl">
                            <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto" />
                            <h2 className="text-4xl font-black text-white">Registered & Checked-In!</h2>
                            <p className="text-emerald-200 text-lg">Welcome, <span className="font-bold text-white">{visitorName}</span>.</p>
                            <div className="p-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl inline-block mt-4">
                                <p className="text-sm text-emerald-400/80 mb-1 font-mono uppercase tracking-widest">Your Token</p>
                                <p className="text-xl font-bold text-emerald-400 font-mono">{successToken}</p>
                            </div>
                            <p className="text-emerald-200/60 text-sm mt-4">Please remember this token or your ID for check-out.</p>
                        </motion.div>
                    )}

                    {step === 'ERROR' && (
                        <motion.div key="error" className="text-center space-y-8 bg-red-950/20 border border-red-500/30 p-16 rounded-3xl backdrop-blur-xl">
                            <UserX className="w-24 h-24 text-red-400 mx-auto" />
                            <h2 className="text-4xl font-black text-white uppercase">Registration Error</h2>
                            <p className="text-red-200 text-xl">{errorMessage}</p>
                            <button onClick={() => setStep('FORM')} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all">Try Again</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
