import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
        const rack = await prisma.rack.findUnique({ where: { id: rackId } });
        if (!rack) {
            return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
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
                customerId: customerId ? parseInt(customerId) : null,
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
    try {
        const { searchParams } = new URL(req.url);
        const rackId = searchParams.get('rackId');
        const customerId = searchParams.get('customerId');

        let equipments = [];

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

        if (customerId) {
            const cid = parseInt(customerId);
            
            // Get customer's own equipments
            const customerEqs = await prisma.rackEquipment.findMany({
                where: { customerId: cid },
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
            const params = {};
            if (rackId) params.rackId = parseInt(rackId);

            equipments = await prisma.rackEquipment.findMany({
                where: params,
                include: includeRelations
            });
        }

        return NextResponse.json(equipments);
    } catch (error) {
        console.error('Fetch Equipments Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
