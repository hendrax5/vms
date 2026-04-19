import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default async function PrintAssetLabelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    if (!id || isNaN(Number(id))) return notFound();

    const equipment = await prisma.rackEquipment.findUnique({
        where: { id: parseInt(id) },
        include: {
            deviceModel: true,
            rack: {
                include: {
                    row: {
                        include: {
                            room: {
                                include: { datacenter: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!equipment) return notFound();

    // Determine what to show in QR code. AssetTag is priority.
    const qrValue = equipment.assetTag || equipment.serialNumber || `VMS-EQ-${equipment.id}`;

    return (
        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 0; size: 100mm 50mm; }
                    body { margin: 0; background-color: white !important; }
                    .no-print { display: none !important; }
                }
                body { background-color: #f1f5f9; }
            `}} />
            
            <div className="no-print mb-8 space-x-4">
                <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-lg">Print Label</button>
                <button onClick={() => window.close()} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold shadow">Close Window</button>
            </div>

            {/* Label Sticker - 100mm x 50mm approx (378px x 189px) */}
            <div className="bg-white border border-black p-4 w-[100mm] h-[50mm] flex items-center gap-6 print:border-none print:w-full print:h-full">
                
                {/* QR Code */}
                <div className="shrink-0 bg-white p-1">
                    <QRCodeSVG value={qrValue} size={110} level="H" />
                </div>
                
                {/* Text Details */}
                <div className="flex-1 flex flex-col justify-center text-black">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 border-b border-black pb-1">
                        {equipment.rack.row.room.datacenter.name} - VMS
                    </div>
                    
                    <div className="font-extrabold text-lg leading-tight uppercase truncate max-w-[200px]" title={equipment.name}>
                        {equipment.name}
                    </div>
                    
                    {equipment.deviceModel && (
                        <div className="text-xs font-semibold text-slate-700 mt-1">
                            {equipment.deviceModel.brand} {equipment.deviceModel.modelName}
                        </div>
                    )}
                    
                    <div className="mt-2 space-y-0.5">
                        <div className="text-[10px] font-mono font-bold bg-slate-100 inline-block px-1">
                            ASSET: {equipment.assetTag || 'N/A'}
                        </div>
                        {equipment.serialNumber && (
                            <div className="text-[10px] font-mono font-bold">
                                S/N: {equipment.serialNumber}
                            </div>
                        )}
                        <div className="text-[9px] font-medium text-slate-500 mt-1">
                            Loc: {equipment.rack.name} (U{equipment.uStart}-U{equipment.uEnd})
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
