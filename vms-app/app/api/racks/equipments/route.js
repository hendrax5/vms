import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { rackId, customerId, name, equipmentType, uStart, uEnd, portCount } = body;

        // Basic validation
        if (!rackId || !name || !equipmentType || !uStart || !uEnd) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (uStart > uEnd) {
             return NextResponse.json({ error: 'uStart cannot be greater than uEnd' }, { status: 400 });
        }

        // Check if Rack exists and has capacity
        const rack = await prisma.rack.findUnique({ where: { id: parseInt(rackId) } });
        if (!rack) {
            return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
        }

        // --- RBAC AUTHORIZATION ---
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const userRole = (session.user?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const isTenantAdmin = ['tenantadmin', 'tenantstaff'].includes(userRole);
        
        if (!isInternalAdmin) {
            if (!isTenantAdmin) {
                return NextResponse.json({ error: 'Forbidden. Read-Only users cannot add equipment.' }, { status: 403 });
            }
            if (rack.customerId !== null && rack.customerId !== Number(session.user.customerId)) {
                return NextResponse.json({ error: 'Forbidden. You cannot add equipment to another tenant\'s private rack.' }, { status: 403 });
            }
        }
        
        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (isTenantAdmin && !isInternalAdmin) {
            finalCustomerId = Number(session.user.customerId); // Force tenant's own ID
        }

        if (uEnd > rack.uCapacity || uStart < 1) {
            return NextResponse.json({ error: `Invalid U values. Rack capacity is 1 to ${rack.uCapacity}` }, { status: 400 });
        }

        // Collision Check: Find any equipment in this rack that overlaps with [uStart, uEnd]
        const existingEquipments = await prisma.rackEquipment.findMany({
            where: { rackId: rackId }
        });

        const collision = existingEquipments.find(eq => {
            return Math.max(eq.uStart, uStart) <= Math.min(eq.uEnd, uEnd);
        });

        if (collision) {
             return NextResponse.json({ 
                 error: `U-Space Collision! Equipment '${collision.name}' already occupies U${collision.uStart}-U${collision.uEnd}` 
             }, { status: 409 });
        }

        // Prepare ports if applicable
        const ports = [];
        const numPorts = portCount ? parseInt(portCount) : (equipmentType === 'PATCH_PANEL' || equipmentType === 'OTB' ? 24 : 0);
        
        for (let i = 1; i <= numPorts; i++) {
            ports.push({ portName: `Port ${i}` });
        }

        // Insert new equipment and its auto-generated ports
        const newEquipment = await prisma.rackEquipment.create({
            data: {
                rackId: parseInt(rackId),
                customerId: finalCustomerId,
                name,
                equipmentType, // SERVER, SWITCH, ROUTER, PATCH_PANEL, OTB
                uStart: parseInt(uStart),
                uEnd: parseInt(uEnd),
                ports: {
                    create: ports
                }
            },
            include: { ports: true }
        });

        return NextResponse.json(newEquipment, { status: 201 });

    } catch (error) {
        console.error('Rack Equipment Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req) {
        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const sessionCustomerId = session?.user?.customerId;

        const includeRelations = { 
            customer: true, 
            ports: true, 
            rack: {
                include: {
                    row: {
                        include: { room: true }
                    }
                }
            } 
        };

        if (!isInternalAdmin) {
            // Strictly enforce isolation for non-admins
            if (!sessionCustomerId) {
                return NextResponse.json({ error: 'Forbidden: No Customer ID' }, { status: 403 });
            }
            
            // Get customer's own equipments
            const customerEqs = await prisma.rackEquipment.findMany({
                where: { customerId: sessionCustomerId },
                include: includeRelations
            });
            
            // Find unique racks they have equipment in
            const rackIds = [...new Set(customerEqs.map(e => e.rackId))];

            // Get facility patch panels in those same racks
            let facilityPanels = [];
            if (rackIds.length > 0) {
                facilityPanels = await prisma.rackEquipment.findMany({
                    where: { 
                        rackId: { in: rackIds },
                        customerId: null,
                        equipmentType: 'PATCH_PANEL'
                    },
                    include: includeRelations
                });
            }

            equipments = [...customerEqs, ...facilityPanels];
        } else {
            // Admin logic
            if (customerId) {
                const cid = parseInt(customerId);
                equipments = await prisma.rackEquipment.findMany({
                    where: { customerId: cid },
                    include: includeRelations
                });
            } else {
                const params = {};
                if (rackId) params.rackId = parseInt(rackId);

                equipments = await prisma.rackEquipment.findMany({
                    where: params,
                    include: includeRelations
                });
            }
        }

        return NextResponse.json(equipments);
    } catch (error) {
        console.error('Fetch Equipments Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
