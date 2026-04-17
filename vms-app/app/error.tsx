'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('PRODC System Error:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 max-w-md w-full text-center relative z-10 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center rounded-full mx-auto mb-6 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">System Interruption</h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                We encountered an unexpected error processing your request. Please try reloading the panel or returning to the dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => reset()}
                    className="flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wider transition-colors rounded-sm shadow-sm"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Try Again
                </button>
                <Link
                    href="/"
                    className="flex items-center justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold uppercase tracking-wider transition-colors border border-slate-700 rounded-sm shadow-sm"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                </Link>
            </div>
        </div>
    </div>
  );
}
