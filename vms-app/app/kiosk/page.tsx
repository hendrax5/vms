'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, CheckCircle2, UserX, AlertTriangle, ShieldCheck, ChevronRight, LogOut, ArrowRightCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const KioskScanner = ({ onScanSuccess }: { onScanSuccess: (text: string) => void }) => {
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [cameras, setCameras] = useState<any[]>([]);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length > 0) {
                setCameras(devices);
                // Try to find front camera
                const front = devices.find(d => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user'));
                setDeviceId(front ? front.id : devices[0].id);
            }
        }).catch(err => console.error("Camera list failed", err));
    }, []);

    useEffect(() => {
        if (!deviceId) return;
        
        const scanner = new Html5Qrcode('kiosk-reader');
        scannerRef.current = scanner;
        let isScanned = false;
        
        scanner.start(
            deviceId,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (text) => {
                if (!isScanned) {
                    isScanned = true;
                    scanner.stop().then(() => scanner.clear()).catch(() => {});
                    onScanSuccess(text);
                }
            },
            () => {}
        ).catch(err => {
            console.warn("Scanner start failed", err);
        });
        
        return () => {
            if (scanner.isScanning) {
                scanner.stop().catch(() => {}).finally(() => scanner.clear());
            } else {
                try { scanner.clear(); } catch(e){}
            }
        };
    }, [deviceId]);

    const flipCamera = () => {
        if (cameras.length < 2) return;
        const currentIndex = cameras.findIndex(c => c.id === deviceId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        setDeviceId(cameras[nextIndex].id);
    };

    return (
        <div className="relative w-full h-full">
            <div id="kiosk-reader" className="w-full h-full text-white bg-slate-900 rounded-3xl overflow-hidden shadow-inner border-[1px] border-slate-700" />
            {cameras.length > 1 && (
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); flipCamera(); }}
                    className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-indigo-500 transition-all z-50"
                    title="Flip Camera"
                >
                    <Camera className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default function DatacenterKiosk() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<'IDLE' | 'CAMERA' | 'PROCESSING' | 'SUCCESS_IN' | 'SUCCESS_OUT' | 'ERROR'>('IDLE');
    const [scannedToken, setScannedToken] = useState('');
    const [manualToken, setManualToken] = useState('');
    const [visitorName, setVisitorName] = useState('');
    const [allVisitors, setAllVisitors] = useState<string[]>([]);
    const [currentVisitorIndex, setCurrentVisitorIndex] = useState(0);
    const [visitorPhotos, setVisitorPhotos] = useState<Record<string, string>>({});
    const [livenessStage, setLivenessStage] = useState<'NONE' | 'LOOK_STRAIGHT' | 'BLINK' | 'NOD' | 'CAPTURING'>('NONE');
    const [guidanceTimer, setGuidanceTimer] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [isCheckoutQueue, setIsCheckoutQueue] = useState(false);
    const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const resetKiosk = () => {
        setStep('IDLE');
        setScannedToken('');
        setVisitorName('');
        setAllVisitors([]);
        setCurrentVisitorIndex(0);
        setVisitorPhotos({});
        setLivenessStage('NONE');
        setGuidanceTimer(0);
        setErrorMessage('');
        setIsCheckoutQueue(false);
        stopCamera();
    };

    // Auto-timeout for success and errors
    useEffect(() => {
        if (step === 'SUCCESS_IN' || step === 'SUCCESS_OUT' || step === 'ERROR') {
            const timer = setTimeout(() => {
                resetKiosk();
            }, 6000); // 6 seconds auto-reset
            return () => clearTimeout(timer);
        }
    }, [step]);

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const startCamera = async (preferredId?: string) => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('Camera API not available. Usually requires HTTPS or localhost.');
                return;
            }

            // Get camera list if not already fetched
            let devices = availableCameras;
            if (devices.length === 0) {
                const all = await navigator.mediaDevices.enumerateDevices();
                devices = all.filter(d => d.kind === 'videoinput');
                setAvailableCameras(devices);
            }

            let constraints: MediaStreamConstraints = { video: { facingMode: 'user' } };
            
            // If a specific device is selected or we found a front camera
            const targetId = preferredId || activeDeviceId;
            if (targetId) {
                constraints = { video: { deviceId: { exact: targetId } } };
            } else {
                // Try to find front camera label if facingMode fails
                const front = devices.find(d => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user'));
                if (front) {
                    constraints = { video: { deviceId: { exact: front.id } } };
                    setActiveDeviceId(front.id);
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access failed", err);
            // Fallback to simple video
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch(e) {}
        }
    };

    const switchActiveCamera = async () => {
        if (availableCameras.length < 2) return;
        const currentIndex = availableCameras.findIndex(c => c.deviceId === activeDeviceId);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        const nextId = availableCameras[nextIndex].deviceId;
        
        setActiveDeviceId(nextId);
        stopCamera();
        await startCamera(nextId);
    };

    const handleQRScanned = async (token: string) => {
        setScannedToken(token);
        setStep('PROCESSING');

        try {
            // First, validate only to get visitor list
            const res = await fetch('/api/permits/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken: token, validateOnly: true })
            });

            const data = await res.json();
            
            if (res.status === 400 && data.error === 'Visitor is already checked in') {
                setIsCheckoutQueue(true);
                await processCheckOut(token);
            } else if (res.ok) {
                const names = data.visitorNames.split(',').map((n: string) => n.trim());
                setAllVisitors(names);
                setVisitorName(names[0]);
                setCurrentVisitorIndex(0);
                setStep('CAMERA');
                
                setTimeout(() => {
                    startCamera();
                    startLivenessSequence();
                }, 800);
            } else {
                setErrorMessage(data.error || 'Invalid QR Code');
                setStep('ERROR');
            }
        } catch (err) {
            setErrorMessage('Network connection lost');
            setStep('ERROR');
        }
    };

    const startLivenessSequence = () => {
        setLivenessStage('LOOK_STRAIGHT');
        setGuidanceTimer(3); // 3 seconds per stage
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'CAMERA' && livenessStage !== 'NONE') {
            interval = setInterval(() => {
                setGuidanceTimer((prev) => {
                    if (prev <= 1) {
                        // Transition stage
                        if (livenessStage === 'LOOK_STRAIGHT') {
                            setLivenessStage('BLINK');
                            return 3;
                        } else if (livenessStage === 'BLINK') {
                            setLivenessStage('NOD');
                            return 3;
                        } else if (livenessStage === 'NOD') {
                            setLivenessStage('CAPTURING');
                            return 1;
                        } else if (livenessStage === 'CAPTURING') {
                            capturePhoto();
                            return 0;
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, livenessStage]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const photoData = canvas.toDataURL('image/jpeg', 0.8);
            
            const newPhotos = { ...visitorPhotos, [allVisitors[currentVisitorIndex]]: photoData };
            setVisitorPhotos(newPhotos);

            if (currentVisitorIndex < allVisitors.length - 1) {
                // Next visitor
                const nextIndex = currentVisitorIndex + 1;
                setCurrentVisitorIndex(nextIndex);
                setVisitorName(allVisitors[nextIndex]);
                setLivenessStage('LOOK_STRAIGHT');
                setGuidanceTimer(3);
            } else {
                // All done
                finalizeCheckIn(newPhotos);
            }
        }
    };

    const finalizeCheckIn = async (photos: Record<string, string>) => {
        stopCamera();
        setStep('PROCESSING');
        try {
            const res = await fetch('/api/permits/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    qrToken: scannedToken, 
                    visitorPhoto: JSON.stringify(photos) 
                })
            });
            if (res.ok) {
                setStep('SUCCESS_IN');
            } else {
                const data = await res.json();
                setErrorMessage(data.error || 'Submission failed');
                setStep('ERROR');
            }
        } catch (err) {
            setErrorMessage('Network error during finalization');
            setStep('ERROR');
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualToken.trim()) {
            handleQRScanned(manualToken.trim());
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/kiosk');
        }
    }, [status, router]);

    if (status === 'loading' || status === 'unauthenticated') {
        return <div className="min-h-[100dvh] bg-[#020817] flex justify-center items-center text-white"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

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

    return (
        <div className="min-h-[100dvh] bg-[#020817] flex flex-col justify-center items-center relative overflow-hidden text-slate-200">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[100px] rounded-full point-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full point-events-none" />
            
            {/* Header Text - Global */}
            <div className="absolute top-10 left-0 w-full text-center z-10">
                <ShieldCheck className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-xl">
                    VMS <span className="text-indigo-400">Datacenter</span>
                </h1>
                <p className="text-slate-400 mt-1 font-medium tracking-widest text-sm uppercase">Visitor Management System</p>
            </div>

            <div className="z-20 w-full max-w-4xl p-8">
                <AnimatePresence mode="wait">
                    
                    {/* STATE: IDLE (QR Scanner Active) */}
                    {step === 'IDLE' && (
                        <motion.div 
                            key="idle"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-2xl p-10 overflow-hidden flex flex-col md:flex-row gap-10 items-center justify-between"
                        >
                            <div className="flex-1 space-y-6">
                                <h2 className="text-5xl font-black text-white leading-tight">
                                    Welcome.<br/>
                                    <span className="text-slate-400">Tap to Scan.</span>
                                </h2>
                                <p className="text-lg text-slate-400">
                                    Please hold your <strong className="text-white">Delivery QR</strong> or <strong className="text-white">Permit Barcode</strong> in front of the tablet's camera to securely Sign-In or Sign-Out.
                                </p>
                                
                                <div className="space-y-4 pt-6">
                                    <div className="flex items-center gap-4 text-sm font-semibold text-slate-300">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white">1</div>
                                        Show Barcode to Camera
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-semibold text-slate-300">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white">2</div>
                                        Verify Identity (Photo Capture)
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-semibold text-slate-300">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-white">3</div>
                                        Leave ID Card at Security Desk
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 w-full max-w-sm relative flex flex-col gap-3">
                                <div className="aspect-square w-full rounded-3xl overflow-hidden bg-black/20 border border-slate-700/50">
                                    <KioskScanner onScanSuccess={handleQRScanned} />
                                </div>
                                <form onSubmit={handleManualSubmit} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={manualToken}
                                        onChange={(e) => setManualToken(e.target.value)}
                                        placeholder="Or enter Permit Code manually..." 
                                        className="flex-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                                    />
                                    <button type="submit" className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 px-4 rounded-xl font-bold transition-all flex items-center justify-center">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </form>
                                {typeof window !== 'undefined' && !window.isSecureContext && (
                                   <div className="text-[10px] text-amber-500/80 uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-2">
                                     <AlertTriangle className="w-3 h-3" /> Camera needs secure context (HTTPS)
                                   </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: CAMERA */}
                    {step === 'CAMERA' && (
                        <motion.div 
                            key="camera"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-indigo-500/30 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(99,102,241,0.2)] p-8 max-w-2xl mx-auto text-center"
                        >
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <Camera className="w-10 h-10 text-indigo-400" />
                                <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-widest">
                                    Visitor {currentVisitorIndex + 1} of {allVisitors.length}
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Biometric Verification</h2>
                            <p className="text-slate-400 mb-8 font-medium">
                                Active Subject: <strong className="text-white text-xl">{visitorName}</strong>
                            </p>
                            
                            <div className="relative rounded-3xl overflow-hidden bg-black aspect-video w-full max-w-xl mx-auto border-4 border-slate-800 mb-8">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                <canvas ref={canvasRef} className="hidden" />
                                
                                {availableCameras.length > 1 && (
                                    <button 
                                        onClick={(e) => { e.preventDefault(); switchActiveCamera(); }}
                                        className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-indigo-500 transition-all z-10"
                                        title="Flip Camera"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                )}
                                
                                {/* Liveness Guidance Overlay */}
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        key={livenessStage}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.2 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                                    >
                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl flex flex-col items-center gap-2">
                                            <div className="text-emerald-400 text-3xl font-black mb-1">
                                                {guidanceTimer > 0 ? guidanceTimer : 'SNAP!'}
                                            </div>
                                            <div className="text-white font-bold text-lg uppercase tracking-widest">
                                                {livenessStage === 'LOOK_STRAIGHT' && "Look Straight at Camera"}
                                                {livenessStage === 'BLINK' && "Blink your eyes"}
                                                {livenessStage === 'NOD' && "Nod your head"}
                                                {livenessStage === 'CAPTURING' && "Hold still..."}
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Face Outline */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-64 border-2 border-indigo-500/30 rounded-full border-dashed animate-pulse" />
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden max-w-sm">
                                    <motion.div 
                                        className="h-full bg-indigo-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${((currentVisitorIndex + 1) / allVisitors.length) * 100}%` }}
                                    />
                                </div>
                                <p className="text-slate-500 text-xs font-bold uppercase">Automated Verification Process</p>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: PROCESSING */}
                    {step === 'PROCESSING' && (
                        <motion.div 
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20"
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-6" />
                            <h2 className="text-2xl font-bold text-white">Securely Validating...</h2>
                            <p className="text-slate-500">Checking credentials with Central Intelligence</p>
                        </motion.div>
                    )}

                    {/* STATE: SUCCESS IN */}
                    {step === 'SUCCESS_IN' && (
                        <motion.div 
                            key="success_in"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-emerald-950/40 border border-emerald-500/20 rounded-[40px] p-16 max-w-2xl mx-auto text-center"
                        >
                            <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
                            <h2 className="text-5xl font-black text-white mb-4">Sign-In Verified!</h2>
                            <p className="text-2xl text-emerald-200/80 mb-8 font-light">Welcome to the Datacenter, <strong className="text-white font-bold">{visitorName}</strong>.</p>
                            
                            <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-2xl p-6 text-emerald-100 flex items-start gap-4 text-left">
                                <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-lg text-white mb-1">Final Step: Leave ID Card</h4>
                                    <p className="text-emerald-200">Please hand over your Physical ID Card (KTP/Passport) to the Security/NOC personnel before entering the secure zone.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: SUCCESS OUT */}
                    {step === 'SUCCESS_OUT' && (
                        <motion.div 
                            key="success_out"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-amber-950/40 border border-amber-500/20 rounded-[40px] p-16 max-w-2xl mx-auto text-center"
                        >
                            <LogOut className="w-24 h-24 text-amber-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                            <h2 className="text-5xl font-black text-white mb-4">Sign-Out Complete!</h2>
                            <p className="text-2xl text-amber-200/80 mb-8 font-light">Thank you for your visit, <strong className="text-white font-bold">{visitorName}</strong>.</p>
                            
                            <div className="bg-amber-900/40 border border-amber-500/30 rounded-2xl p-6 text-amber-100 flex items-start gap-4 text-left">
                                <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-lg text-white mb-1">Collect Your ID Card</h4>
                                    <p className="text-amber-200">Don't forget to take your Physical Identity Card back from the Security front desk.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: ERROR */}
                    {step === 'ERROR' && (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-red-950/40 border border-red-500/30 rounded-[40px] p-16 max-w-2xl mx-auto text-center"
                        >
                            <UserX className="w-24 h-24 text-red-500 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                            <h2 className="text-4xl font-black text-white mb-4">Verification Failed</h2>
                            <p className="text-xl text-red-200/80 mb-8 font-light">{errorMessage}</p>
                            
                            <button onClick={resetKiosk} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white rounded-xl font-bold transition-all">
                                Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Footer */}
            <div className="absolute bottom-8 left-0 w-full text-center z-10 text-slate-600 text-xs font-mono font-bold tracking-widest uppercase">
                VMS Terminal Core OS v4.2 • Secure Kiosk Process
            </div>
        </div>
    );
}
