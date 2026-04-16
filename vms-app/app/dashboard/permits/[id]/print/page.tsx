'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'next/navigation';

export default function BuildingExitPassPrint() {
    const params = useParams();
    const [permit, setPermit] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/permits`)
            .then(res => res.json())
            .then(data => {
                const found = data.find((p: any) => p.id.toString() === params.id);
                setPermit(found);
            });
    }, [params.id]);

    useEffect(() => {
        if (permit) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [permit]);

    if (!permit) return <div className="p-10 font-mono text-sm">Loading printing spooler...</div>;

    const companyName = permit.customer?.name || permit.companyName || 'Unknown Entity';

    return (
        <div className="bg-white min-h-screen text-black p-10 font-serif max-w-4xl mx-auto">
            <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">DATA CENTER OPERATIONS</h1>
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-600 mt-1">Building Exit Permission Pass</h2>
                </div>
                <div className="text-right">
                    <p className="font-mono text-xl font-bold border-2 border-black px-4 py-2">PRM-{permit.id.toString().padStart(5, '0')}</p>
                </div>
            </div>

            <div className="flex gap-8 mb-8">
                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 border-b border-gray-300 pb-2">
                        <span className="font-bold text-gray-600">Generated Date</span>
                        <span className="col-span-2 font-mono">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-gray-300 pb-2">
                        <span className="font-bold text-gray-600">Tenant / Company</span>
                        <span className="col-span-2 font-bold text-lg">{companyName}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-gray-300 pb-2">
                        <span className="font-bold text-gray-600">Facility Location</span>
                        <span className="col-span-2">{permit.datacenter?.name}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-gray-300 pb-2">
                        <span className="font-bold text-gray-600">Authorized Personnel</span>
                        <span className="col-span-2">{permit.visitorNames}</span>
                    </div>
                </div>
                <div className="w-40 h-40 border-4 border-black p-2 flex items-center justify-center">
                     <QRCodeSVG value={`EXIT-PASS-PRM-${permit.id}`} size={140} level="M" />
                </div>
            </div>

            <div className="mb-12">
                <h3 className="font-black uppercase bg-black text-white px-4 py-2 mb-4">Cargo & Property Details</h3>
                <div className="border-2 border-black p-6 font-mono text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{permit.activity}</p>
                </div>
                <p className="mt-2 text-xs italic text-gray-500">* This section declares the hardware intended for physical removal from the building premises.</p>
            </div>

            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-gray-300 text-center">
                <div>
                    <div className="h-24"></div>
                    <div className="border-t-2 border-black pt-2 font-bold">Requested By (Tenant)</div>
                </div>
                <div>
                    <div className="h-24"></div>
                    <div className="border-t-2 border-black pt-2 font-bold">Building Security</div>
                </div>
                <div>
                    <div className="h-24"></div>
                    <div className="border-t-2 border-black pt-2 font-bold">NOC Administrator</div>
                </div>
            </div>

            {/* Print Hiding Style */}
            <style jsx global>{`
                @media print {
                    nav, header, aside, .sidebar { display: none !important; }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
}
