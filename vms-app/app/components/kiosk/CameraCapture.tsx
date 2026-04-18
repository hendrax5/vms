'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        async function startCamera() {
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' }
                });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (err) {
                console.error("Error accessing camera:", err);
            }
        }
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            onCapture(canvas.toDataURL('image/jpeg'));
        }
    };

    return (
        <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25"></div>
                <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl w-full max-w-md aspect-video">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
            </div>
            <button
                onClick={capturePhoto}
                className="flex items-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
                <Camera className="w-6 h-6" />
                <span>Ambil Foto</span>
            </button>
        </div>
    );
};

export default CameraCapture;
