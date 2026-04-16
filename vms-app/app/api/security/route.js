import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const activePermits = await prisma.visitPermit.findMany({
            where: {
                status: 'CheckIn'
            },
            include: {
                customer: true,
                site: true
            }
        });

        const recentEvents = await prisma.permitEventLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 20,
            include: {
                permit: {
                    select: {
                        visitorNames: true,
                        companyName: true,
                        requiresEscort: true
                    }
                }
            }
        });

        return NextResponse.json({
            activeVisitors: activePermits.length,
            escortsRequired: activePermits.filter(p => p.requiresEscort).length,
            activePermits,
            recentEvents
        });

    } catch (error) {
        console.error('Security API Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
