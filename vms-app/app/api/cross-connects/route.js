import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { datacenterId, customerId, mediaType, sideAPortId, sideZPortId, destination, targetType, targetProvider, targetNotes } = body;

        if (!datacenterId || !sideAPortId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (sideZPortId && sideAPortId === sideZPortId) {
            return NextResponse.json({ error: 'Side A and Side Z cannot be the same port.' }, { status: 400 });
        }

        const pSideA = parseInt(sideAPortId);
        const pSideZ = sideZPortId ? parseInt(sideZPortId) : null;

        const existingConnections = await prisma.crossConnect.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { sideAPortId: pSideA },
                            ...(pSideZ ? [{ sideZPortId: pSideA }] : []),
                            ...(pSideZ ? [{ sideAPortId: pSideZ }] : []),
                            ...(pSideZ ? [{ sideZPortId: pSideZ }] : [])
                        ]
                    },
                    {
                        status: {
                            notIn: ['Terminated']
                        }
                    }
                ]
            }
        });

        if (existingConnections.length > 0) {
             return NextResponse.json({ error: `Port Collision! One of the selected ports is already in use.` }, { status: 409 });
        }

        let finalProvider = targetProvider;
        if (targetProvider === 'Other' || targetType === 'Custom') finalProvider = targetNotes;

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        const newConnection = await prisma.crossConnect.create({
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: finalCustomerId,
                mediaType: mediaType || 'Singlemode Fiber',
                sideAPortId: pSideA,
                sideZPortId: pSideZ,
                targetType: targetType || null,
                targetProvider: finalProvider || destination || null,
                status: 'Requested'
            }
        });

        return NextResponse.json(newConnection, { status: 201 });

    } catch (error) {
        console.error('Cross-Connect Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const { searchParams } = new URL(req.url);
        const datacenterId = searchParams.get('datacenterId');
        const customerId = searchParams.get('customerId');

        const params = {};
        if (datacenterId) params.datacenterId = parseInt(datacenterId);
        
        if (sessionCustomerId) {
            params.customerId = sessionCustomerId;
        } else if (customerId) {
            params.customerId = parseInt(customerId);
        }

        const connections = await prisma.crossConnect.findMany({
            where: params,
            include: { 
                customer: true, 
                sideAPort: {
                    include: { equipment: { include: { rack: true } } }
                }, 
                sideZPort: {
                    include: { equipment: { include: { rack: true } } }
                } 
            }
        });

        return NextResponse.json(connections);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { action, id, status, datacenterId, customerId, mediaType, sideAPortId, sideZPortId, destination, targetType, targetProvider, targetNotes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing Cross Connect ID' }, { status: 400 });
        }

        const existingConnection = await prisma.crossConnect.findUnique({ where: { id: parseInt(id) } });
        if (!existingConnection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (sessionCustomerId && existingConnection.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Backward compatibility for status updates
        if (!action || action === 'status_update') {
            if (!status) return NextResponse.json({ error: 'Missing status field' }, { status: 400 });
            const updatedConnection = await prisma.crossConnect.update({
                where: { id: parseInt(id) },
                data: { status }
            });
            return NextResponse.json(updatedConnection);
        }

        // Full edit workflow
        if (!datacenterId || !sideAPortId) {
            return NextResponse.json({ error: 'Missing required configuration fields for update' }, { status: 400 });
        }
        
        if (sideZPortId && sideAPortId === sideZPortId) {
            return NextResponse.json({ error: 'Side A and Side Z cannot be the same port.' }, { status: 400 });
        }

        const pSideA = parseInt(sideAPortId);
        const pSideZ = sideZPortId ? parseInt(sideZPortId) : null;

        // Port Anti-Collision Validation (excluding the current connection itself)
        const existingConnections = await prisma.crossConnect.findMany({
            where: {
                id: { not: parseInt(id) },
                AND: [
                    {
                        OR: [
                            { sideAPortId: pSideA },
                            ...(pSideZ ? [{ sideZPortId: pSideA }] : []),
                            ...(pSideZ ? [{ sideAPortId: pSideZ }] : []),
                            ...(pSideZ ? [{ sideZPortId: pSideZ }] : [])
                        ]
                    },
                    {
                        status: {
                            notIn: ['Terminated']
                        }
                    }
                ]
            }
        });

        if (existingConnections.length > 0) {
             return NextResponse.json({ error: `Port Collision Detected! That port is actively routing another live connection.` }, { status: 409 });
        }

        let finalProvider = targetProvider;
        if (targetProvider === 'Other' || targetType === 'Custom') finalProvider = targetNotes;

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        const updatedConnection = await prisma.crossConnect.update({
            where: { id: parseInt(id) },
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: finalCustomerId,
                mediaType: mediaType || 'Singlemode Fiber',
                sideAPortId: pSideA,
                sideZPortId: pSideZ,
                targetType: targetType || null,
                targetProvider: finalProvider || destination || null,
            }
        });

        return NextResponse.json(updatedConnection);
    } catch (error) {
        console.error('Update Cross-Connect Error:', error);
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
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingConnection = await prisma.crossConnect.findUnique({ where: { id: parseInt(id) } });
        if (!existingConnection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (sessionCustomerId && existingConnection.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.crossConnect.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ message: 'Cross-connect deleted successfully' });
    } catch (error) {
        console.error('Delete Cross-Connect Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
