import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const rackId = parseInt(params.id);
        const logs = await prisma.infrastructureAuditLog.findMany({
            where: {
                equipment: {
                    rackId: rackId
                }
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                equipment: { select: { name: true, equipmentType: true } }
            },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        return NextResponse.json(logs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
