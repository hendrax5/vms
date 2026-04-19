import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const sessionCustomerId = session?.user?.customerId;

        let whereClause = {};

        if (!isInternalAdmin) {
            if (!sessionCustomerId) {
                return NextResponse.json({ error: 'Forbidden: No Customer ID assigned to this tenant admin' }, { status: 403 });
            }
            const cId = parseInt(sessionCustomerId, 10);
            whereClause = {
                OR: [
                    { customerId: cId },
                    { customerId: null },
                    { equipments: { some: { customerId: cId } } }
                ]
            };
        }

        const racks = await prisma.rack.findMany({
            where: whereClause,
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
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionCustomerId = session?.user?.customerId;
        const body = await req.json();
        const { rowId, name, uCapacity, customerId } = body;

        if (!rowId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Enforcement: Tenant Admin can only create racks for their own customerId
        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        const newRack = await prisma.rack.create({
            data: {
                rowId: parseInt(rowId),
                name,
                uCapacity: uCapacity ? parseInt(uCapacity) : 42,
                customerId: finalCustomerId
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
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const sessionCustomerId = session?.user?.customerId;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing rack ID' }, { status: 400 });
        }

        const existingRack = await prisma.rack.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingRack) {
            return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
        }

        // Security: Tenant Admin cannot delete internal racks or racks belonging to others
        if (sessionCustomerId && existingRack.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this rack' }, { status: 403 });
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
