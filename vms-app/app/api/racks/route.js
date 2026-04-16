import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const racks = await prisma.rack.findMany({
            include: { 
                row: {
                    include: {
                        room: {
                            include: {
                                datacenter: true
                            }
                        }
                    }
                },
                equipments: {
                    include: {
                        ports: true
                    }
                } 
            }
        });
        
        // Transform the data to calculate used capacity
        const detailedRacks = racks.map(rack => {
             const usedCapacity = rack.equipments.reduce((sum, eq) => sum + ((eq.uEnd - eq.uStart) + 1), 0);
             return {
                 ...rack,
                 rowName: rack.row?.name,
                 roomName: rack.row?.room?.name,
                 siteName: rack.row?.room?.datacenter?.name,
                 siteCode: rack.row?.room?.datacenter?.code,
                 used: usedCapacity
             };
        });

        return NextResponse.json(detailedRacks);
    } catch (error) {
        console.error('Fetch Racks Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { rowId, name, uCapacity } = body;

        if (!rowId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newRack = await prisma.rack.create({
            data: {
                rowId: parseInt(rowId),
                name,
                uCapacity: uCapacity ? parseInt(uCapacity) : 42
            }
        });

        return NextResponse.json(newRack, { status: 201 });
    } catch (error) {
        console.error('Create Rack Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing rack ID' }, { status: 400 });
        }

        await prisma.rack.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Delete Rack Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
