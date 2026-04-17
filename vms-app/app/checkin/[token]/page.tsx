import { NextResponse } from 'next/server';

export default function CheckinPage({ params }: { params: { token: string } }) {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-black">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">QR Validation Kiosk</h1>
                <p className="text-slate-400 mb-6">Validating token: {params.token}...</p>
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-2 bg-slate-700 rounded"></div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                      </div>
                      <div className="h-2 bg-slate-700 rounded"></div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
}
