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
        const { datacenterId, customerId, mediaType, sideAPortId, sideZPortId, destination, targetType, targetProvider, targetNotes, sideACompany, sideZCompany, mmrSideAPortId, mmrSideZPortId, status } = body;

        if (!datacenterId || !sideAPortId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (sideZPortId && sideAPortId === sideZPortId) {
            return NextResponse.json({ error: 'Side A and Side Z cannot be the same port.' }, { status: 400 });
        }

        const pSideA = parseInt(sideAPortId);
        const pSideZ = sideZPortId ? parseInt(sideZPortId) : null;
        const pMmrSideA = mmrSideAPortId ? parseInt(mmrSideAPortId) : null;
        const pMmrSideZ = mmrSideZPortId ? parseInt(mmrSideZPortId) : null;

        const requestedPorts = [pSideA, pSideZ, pMmrSideA, pMmrSideZ].filter(Boolean);

        const existingConnections = await prisma.crossConnect.findMany({
            where: {
                AND: [
                    {
                        OR: requestedPorts.flatMap(portId => [
                            { sideAPortId: portId },
                            { sideZPortId: portId },
                            { mmrSideAPortId: portId },
                            { mmrSideZPortId: portId }
                        ])
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

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (!isInternalAdmin && sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        let initialStatus = status || 'Requested';
        if (!status && targetType === 'tenant') {
            initialStatus = 'Pending Target Approval';
        }

        const newConnection = await prisma.crossConnect.create({
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: finalCustomerId,
                mediaType: mediaType || 'Singlemode Fiber',
                sideAPortId: pSideA,
                sideZPortId: pSideZ,
                sideACompany: sideACompany || null,
                sideZCompany: sideZCompany || null,
                targetType: targetType || null,
                targetProvider: finalProvider || destination || null,
                status: initialStatus,
                mmrSideAPortId: pMmrSideA,
                mmrSideZPortId: pMmrSideZ
            },
            include: { customer: true }
        });

        // If target is tenant, notify them to approve and assign port
        if (targetType === 'tenant' && newConnection.targetProvider) {
            const targetCustomer = await prisma.customer.findUnique({
                where: { id: parseInt(newConnection.targetProvider) }
            });
            
            if (targetCustomer) {
                await prisma.inboxMessage.create({
                    data: {
                        datacenterId: parseInt(datacenterId),
                        messageId: `cx-request-${Date.now()}-${newConnection.id}`,
                        from: 'NOC Automated System',
                        to: targetCustomer.name,
                        subject: `Action Required: Pending Cross-Connect Request CX-${newConnection.id}`,
                        bodyText: `You have received a new cross connect request (CX-${newConnection.id}) from ${newConnection.customer?.name || 'Another Tenant'}. Please log in to approve the request and assign your Rack, Patch Panel, and Port.`,
                    }
                });
            }
        }

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

        const { searchParams } = new URL(req.url);
        const datacenterId = searchParams.get('datacenterId');
        const customerId = searchParams.get('customerId');
        const search = searchParams.get('search');

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        let where = {};
        if (datacenterId) where.datacenterId = parseInt(datacenterId);
        
        if (!isInternalAdmin) {
            const sessionCustomerId = session?.user?.customerId;
            if (!sessionCustomerId) {
                return NextResponse.json({ error: 'Forbidden: No Customer ID' }, { status: 403 });
            }
            where.OR = [
                { customerId: sessionCustomerId },
                {
                    AND: [
                        { targetType: 'tenant' },
                        { targetProvider: sessionCustomerId.toString() }
                    ]
                }
            ];
        } else if (customerId) {
            where.customerId = parseInt(customerId);
        }

        if (search) {
            const searchLower = search.trim();
            where = {
                ...where,
                OR: [
                    { ewoCode: { contains: searchLower, mode: 'insensitive' } },
                    { apjiiCode: { contains: searchLower, mode: 'insensitive' } },
                    { labelNumber: { contains: searchLower, mode: 'insensitive' } },
                    { notes: { contains: searchLower, mode: 'insensitive' } },
                    { targetProvider: { contains: searchLower, mode: 'insensitive' } },
                    { sideACompany: { contains: searchLower, mode: 'insensitive' } },
                    { sideZCompany: { contains: searchLower, mode: 'insensitive' } },
                    { customer: { name: { contains: searchLower, mode: 'insensitive' } } },
                    { sideAPort: { equipment: { name: { contains: searchLower, mode: 'insensitive' } } } },
                    { sideZPort: { equipment: { name: { contains: searchLower, mode: 'insensitive' } } } }
                ]
            };
        }

        const connections = await prisma.crossConnect.findMany({
            where: where,
            include: { 
                customer: true, 
                sideAPort: {
                    include: { equipment: { include: { rack: true } } }
                }, 
                sideZPort: {
                    include: { equipment: { include: { rack: true } } }
                },
                mmrSideAPort: {
                    include: { equipment: { include: { rack: true } } }
                },
                mmrSideZPort: {
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
        const { action, id, status, datacenterId, customerId, mediaType, sideAPortId, sideZPortId, destination, targetType, targetProvider, targetNotes, sideACompany, sideZCompany, mmrSideAPortId, mmrSideZPortId } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing Cross Connect ID' }, { status: 400 });
        }

        const existingConnection = await prisma.crossConnect.findUnique({ where: { id: parseInt(id) } });
        if (!existingConnection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (sessionCustomerId && existingConnection.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Target Tenant Approval workflow
        if (action === 'approve_target') {
            if (!sideZPortId) return NextResponse.json({ error: 'Missing Side Z Port' }, { status: 400 });
            
            const pSideZ = parseInt(sideZPortId);

            // Anti-Collision check for the selected Side Z port
            const existingConnections = await prisma.crossConnect.findMany({
                where: {
                    id: { not: parseInt(id) },
                    AND: [
                        { OR: [
                            { sideAPortId: pSideZ }, 
                            { sideZPortId: pSideZ },
                            { mmrSideAPortId: pSideZ },
                            { mmrSideZPortId: pSideZ }
                        ] },
                        { status: { notIn: ['Terminated'] } }
                    ]
                }
            });

            if (existingConnections.length > 0) {
                 return NextResponse.json({ error: `Port Collision Detected! That port is actively routing another live connection.` }, { status: 409 });
            }

            const updatedConnection = await prisma.crossConnect.update({
                where: { id: parseInt(id) },
                data: { 
                    sideZPortId: pSideZ,
                    sideZCompany: sideZCompany || existingConnection.sideZCompany,
                    status: 'Requested' // Escalated back to Datacenter for physical cabling
                },
                include: { customer: true }
            });

            if (updatedConnection.customerId) {
                await prisma.inboxMessage.create({
                    data: {
                        datacenterId: updatedConnection.datacenterId,
                        messageId: `cx-approved-a-${Date.now()}-${id}`,
                        from: 'NOC Automated System',
                        to: updatedConnection.customer?.name || 'Customer',
                        subject: `Cross-Connect Approved by Target: CX-${id}`,
                        bodyText: `Your cross connect request CX-${id} has been approved by the target tenant. The NOC team will now proceed with physical cabling.`,
                    }
                });
            }

            return NextResponse.json(updatedConnection);
        }

        // Backward compatibility for status updates
        if (!action || action === 'status_update') {
            if (!status) return NextResponse.json({ error: 'Missing status field' }, { status: 400 });
            const updatedConnection = await prisma.crossConnect.update({
                where: { id: parseInt(id) },
                data: { status },
                include: { customer: true }
            });

            // Send notification upon Activation
            if (status === 'Active') {
                const dcId = updatedConnection.datacenterId;
                
                // For Side A Tenant
                if (updatedConnection.customerId) {
                    await prisma.inboxMessage.create({
                        data: {
                            datacenterId: dcId,
                            messageId: `cx-active-a-${Date.now()}-${id}`,
                            from: 'NOC Automated System',
                            to: updatedConnection.customer?.name || 'Customer',
                            subject: `Cross-Connect Activated: CX-${id}`,
                            bodyText: `Your cross connect request CX-${id} has been physically completed by the NOC team and is now Active.`,
                        }
                    });
                }

                // For Side Z Tenant
                if (updatedConnection.targetType === 'tenant' && updatedConnection.targetProvider) {
                    const targetCustomer = await prisma.customer.findUnique({
                        where: { id: parseInt(updatedConnection.targetProvider) }
                    });
                    if (targetCustomer) {
                        await prisma.inboxMessage.create({
                            data: {
                                datacenterId: dcId,
                                messageId: `cx-active-z-${Date.now()}-${id}`,
                                from: 'NOC Automated System',
                                to: targetCustomer.name,
                                subject: `Incoming Cross-Connect Activated: CX-${id}`,
                                bodyText: `The incoming cross connect CX-${id} has been physically completed by the NOC team and is now Active.`,
                            }
                        });
                    }
                }
            }

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
        const pMmrSideA = mmrSideAPortId ? parseInt(mmrSideAPortId) : null;
        const pMmrSideZ = mmrSideZPortId ? parseInt(mmrSideZPortId) : null;

        const requestedPorts = [pSideA, pSideZ, pMmrSideA, pMmrSideZ].filter(Boolean);

        // Port Anti-Collision Validation (excluding the current connection itself)
        const existingConnections = await prisma.crossConnect.findMany({
            where: {
                id: { not: parseInt(id) },
                AND: [
                    {
                        OR: requestedPorts.flatMap(portId => [
                            { sideAPortId: portId },
                            { sideZPortId: portId },
                            { mmrSideAPortId: portId },
                            { mmrSideZPortId: portId }
                        ])
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

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (!isInternalAdmin && sessionCustomerId) {
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
                sideACompany: sideACompany || null,
                sideZCompany: sideZCompany || null,
                targetType: targetType || null,
                targetProvider: finalProvider || destination || null,
                mmrSideAPortId: pMmrSideA,
                mmrSideZPortId: pMmrSideZ
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

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        if (!isInternalAdmin && sessionCustomerId && existingConnection.customerId !== sessionCustomerId) {
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
