import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET() {
    try {
        // 1. Visit Permits
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activePermits = await prisma.visitPermit.count({
            where: {
                status: { in: ['Approved', 'Checked In'] }
            }
        });

        const todayPermits = await prisma.visitPermit.count({
            where: {
                createdAt: { gte: today }
            }
        });

        // 2. Cross Connects
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const activeCrossConnects = await prisma.crossConnect.count({
            where: {
                status: { in: ['ACTIVE', 'Provisioned'] }
            }
        });

        const weekCrossConnects = await prisma.crossConnect.count({
            where: {
                createdAt: { gte: startOfWeek }
            }
        });

        // 3. Rack Utilization
        const racks = await prisma.rack.findMany({
            include: { equipments: true }
        });

        let racksOver80 = 0;
        let totalUsedU = 0;
        let totalAvailableU = 0;

        for (const rack of racks) {
            const capacity = rack.uCapacity || 42;
            let usedUInRack = 0;
            for (const eq of rack.equipments) {
                const uSize = eq.uEnd - eq.uStart + 1;
                if (uSize > 0) usedUInRack += uSize;
            }

            totalUsedU += usedUInRack;
            totalAvailableU += capacity;

            if (usedUInRack / capacity > 0.8) {
                racksOver80++;
            }
        }

        const stats = {
            activePermits,
            todayPermits,
            racksOver80,
            activeCrossConnects,
            weekCrossConnects,
            totalUsedU,
            totalAvailableU,
            utilizationPercent: totalAvailableU > 0 ? Math.round((totalUsedU / totalAvailableU) * 100) : 0
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Dashboard Stats API Error:', JSON.stringify(error));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
