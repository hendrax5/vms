import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ group: 'asc' }, { id: 'asc' }]
        });
        
        return NextResponse.json(permissions);
    } catch (error) {
        console.error('Fetch Permissions Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { key, label, group } = body;

        if (!key || !label) {
            return NextResponse.json({ error: 'Permission key and label are required' }, { status: 400 });
        }

        // Ensure key is unique
        const existing = await prisma.permission.findUnique({
            where: { key }
        });
        
        if (existing) {
            return NextResponse.json({ error: 'Permission key already exists' }, { status: 400 });
        }

        const permission = await prisma.permission.create({
            data: {
                key,
                label,
                group: group || 'Custom'
            }
        });

        // Audit Log
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id ? parseInt(session.user.id) : null;
        const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
        await prisma.systemAuditLog.create({
            data: {
                action: 'CREATE_PERMISSION',
                resource: 'Permission',
                details: JSON.stringify({ key, group }),
                ipAddress: ipAddress,
                userId: userId
            }
        });

        return NextResponse.json(permission);
    } catch (error) {
        console.error('Create Permission Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
