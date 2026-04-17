import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const action = searchParams.get('action');
        
        let where = {};
        if (action) {
            // Support comma separated actions
            if (action.includes(',')) {
                where.action = { in: action.split(',') };
            } else {
                where.action = action;
            }
        }

        const logs = await prisma.systemAuditLog.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}
