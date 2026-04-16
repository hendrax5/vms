import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calculate total SLA downtime logic based on VendorMaintenance table
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year') || new Date().getFullYear();
        const month = searchParams.get('month') || (new Date().getMonth() + 1);

        // Define the start and end of the requested month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Fetch all maintenance tickets within range
        const maintenances = await prisma.vendorMaintenance.findMany({
            where: {
                startTime: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                affectedRacks: true
            }
        });

        // Build intervals for accurate downtime calculation without double-counting
        const eventIntervals = [];
        const affectedRackIds = new Set();
        
        const mappedMaintenances = maintenances.map(m => {
            let actualMins = 0;
            if (m.endTime) {
                 const diffMs = new Date(m.endTime) - new Date(m.startTime);
                 const diffMins = Math.floor(diffMs / 60000);
                 actualMins = m.slaDowntimeMins > 0 ? m.slaDowntimeMins : diffMins;

                 const startTs = new Date(m.startTime).getTime();
                 const endTs = startTs + (actualMins * 60000);
                 eventIntervals.push([startTs, endTs]);
            }
            
            m.affectedRacks.forEach(r => affectedRackIds.add(r.id));
            
            return {
                id: m.id,
                description: m.description || 'Maintenance Event',
                vendorName: m.type,
                startTime: m.startTime,
                endTime: m.endTime,
                downtimeMins: actualMins,
                isDowntimeEvent: actualMins > 0,
                type: m.type
            };
        });

        // Merge overlapping intervals
        eventIntervals.sort((a, b) => a[0] - b[0]);
        const mergedIntervals = [];
        if (eventIntervals.length > 0) {
            let current = eventIntervals[0];
            for (let i = 1; i < eventIntervals.length; i++) {
                if (eventIntervals[i][0] <= current[1]) {
                    current[1] = Math.max(current[1], eventIntervals[i][1]);
                } else {
                    mergedIntervals.push(current);
                    current = eventIntervals[i];
                }
            }
            mergedIntervals.push(current);
        }

        const totalDowntimeMinutes = mergedIntervals.reduce((total, interval) => {
            return total + Math.floor((interval[1] - interval[0]) / 60000);
        }, 0);

        // Dynamically calculate total minutes in this specific month
        const daysInMonth = new Date(year, month, 0).getDate();
        const totalMinutesInMonth = daysInMonth * 24 * 60;
        const uptimePercentage = ((totalMinutesInMonth - totalDowntimeMinutes) / totalMinutesInMonth) * 100;

        return NextResponse.json({
            period: `${year}-${month.toString().padStart(2, '0')}`,
            totalDowntime: totalDowntimeMinutes,
            uptime: uptimePercentage, // Send as number
            incidentsCount: mappedMaintenances.length,
            uniqueRacksAffected: affectedRackIds.size,
            incidents: mappedMaintenances
        });

    } catch (error) {
        console.error('SLA Engine Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
