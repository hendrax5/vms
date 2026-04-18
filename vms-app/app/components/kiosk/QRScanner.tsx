'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff, Maximize, Loader2 } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
    const [isStarted, setIsStarted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const readerId = "reader";

    useEffect(() => {
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                // Check for available cameras
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    await scanner.start(
                        { facingMode: "environment" },
                        {
                            fps: 15,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            // On success
                            onScanSuccess(decodedText);
                        },
                        (errorMessage) => {
                            // We ignore normal scan failures (no QR found in frame)
                            // But pass to prop if provided
                            if (onScanFailure) onScanFailure(errorMessage);
                        }
                    );
                    setIsStarted(true);
                    setError(null);
                } else {
                    setError("No camera devices found. Please use manual entry.");
                }
            } catch (err: any) {
                console.error("QR Scanner start error:", err);
                setError("Camera access denied or device not found.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(e => console.error("Error stopping scanner:", e));
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div className="relative group w-full aspect-square max-w-sm mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col items-center justify-center">
                <div id={readerId} className="w-full h-full overflow-hidden">
                    {!isStarted && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 space-y-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Initializing Optics...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 p-6 text-center space-y-4">
                            <div className="bg-red-500/20 p-4 rounded-full">
                                <CameraOff className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-white font-bold uppercase tracking-tight">Vision Offline</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
                        </div>
                    )}

                    {isStarted && !error && (
                        <div className="absolute inset-0 pointer-events-none z-10 border-[40px] border-black/40">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-blue-500/50 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br"></div>
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,1)] animate-scanner-scan"></div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
            
            {isStarted && (
                <div className="mt-4 flex justify-between items-center px-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Optic System Online</span>
                    </div>
                    <Maximize className="w-4 h-4 text-slate-500" />
                </div>
            )}
        </div>
    );
};

export default QRScanner;
