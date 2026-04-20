import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const body = await req.json();
        const session = await getServerSession(authOptions);
        
        const userRole = (session?.user?.role || '').toLowerCase().replace(/\s+/g, '');
        const isSuperAdmin = userRole === 'superadmin';
        
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Unauthorized. Only SuperAdmin can modify global topology.' }, { status: 403 });
        }

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Payload must be an array' }, { status: 400 });
        }

        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        // Cache objects to avoid repeated lookups
        const regionsCache = new Map();
        const dcCache = new Map();
        const roomCache = new Map();
        const rowCache = new Map();

        for (let i = 0; i < body.length; i++) {
            const item = body[i];
            try {
                if (!item.regionName || !item.dcName || !item.roomName || !item.rowName || !item.rackName) {
                    throw new Error("Missing required hierarchy names");
                }

                // 1. Resolve Region
                let region = regionsCache.get(item.regionName);
                if (!region) {
                    region = await prisma.region.findFirst({ where: { name: item.regionName } });
                    if (!region) {
                        region = await prisma.region.create({ data: { name: item.regionName } });
                    }
                    regionsCache.set(item.regionName, region);
                }

                // 2. Resolve Datacenter
                let dcKey = `${region.id}-${item.dcName}`;
                let dc = dcCache.get(dcKey);
                if (!dc) {
                    dc = await prisma.datacenter.findFirst({ where: { regionId: region.id, name: item.dcName } });
                    if (!dc) {
                        dc = await prisma.datacenter.create({ data: { regionId: region.id, name: item.dcName, code: item.dcCode || item.dcName.substring(0,3).toUpperCase(), isMmr: false } });
                    }
                    dcCache.set(dcKey, dc);
                }

                // 3. Resolve Room
                let roomKey = `${dc.id}-${item.roomName}`;
                let room = roomCache.get(roomKey);
                if (!room) {
                    room = await prisma.dataRoom.findFirst({ where: { datacenterId: dc.id, name: item.roomName } });
                    if (!room) {
                        room = await prisma.dataRoom.create({ data: { datacenterId: dc.id, name: item.roomName } });
                    }
                    roomCache.set(roomKey, room);
                }

                // 4. Resolve Row
                let rowKey = `${room.id}-${item.rowName}`;
                let row = rowCache.get(rowKey);
                if (!row) {
                    row = await prisma.row.findFirst({ where: { roomId: room.id, name: item.rowName } });
                    if (!row) {
                        row = await prisma.row.create({ data: { roomId: room.id, name: item.rowName } });
                    }
                    rowCache.set(rowKey, row);
                }

                // 5. Resolve/Create Rack
                const existingRack = await prisma.rack.findFirst({ where: { rowId: row.id, name: item.rackName } });
                
                let cid = null;
                if (item.tenantCode) {
                    const cust = await prisma.customer.findUnique({ where: { code: item.tenantCode } });
                    if (cust) cid = cust.id;
                }

                if (existingRack) {
                    await prisma.rack.update({
                        where: { id: existingRack.id },
                        data: {
                            uCapacity: item.uCapacity ? parseInt(item.uCapacity) : existingRack.uCapacity,
                            customerId: cid !== null ? cid : undefined
                        }
                    });
                } else {
                    await prisma.rack.create({
                        data: {
                            rowId: row.id,
                            name: item.rackName,
                            uCapacity: item.uCapacity ? parseInt(item.uCapacity) : 42,
                            customerId: cid
                        }
                    });
                }

                results.successCount++;
            } catch (err) {
                results.failedCount++;
                results.errors.push({ index: i, name: item.rackName, message: err.message });
            }
        }

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
