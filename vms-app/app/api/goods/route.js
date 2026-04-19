import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');

        let where = {};
        if (!isInternalAdmin) {
            if (!sessionCustomerId) {
                return NextResponse.json({ error: 'Forbidden: No Customer ID' }, { status: 403 });
            }
            where.customerId = parseInt(sessionCustomerId, 10);
        } else if (customerId) {
            where.customerId = parseInt(customerId);
        }

        const data = await prisma.goodsItem.findMany({ 
            where,
            orderBy: { id: 'desc' },
            include: { datacenter: true }
        });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        
        let finalCustomerId = body.customerId ? parseInt(body.customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = parseInt(sessionCustomerId, 10);
        }

        // Add customer ID to payload
        const payload = {
            ...body,
            customerId: finalCustomerId,
            qrCode: body.qrCode || `GDS-${Math.random().toString(36).substring(7).toUpperCase()}`,
            status: body.status || 'Inbound'
        };

        const data = await prisma.goodsItem.create({ data: payload });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
