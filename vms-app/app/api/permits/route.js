import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');
        
        let whereClause = {};
        if (sessionCustomerId) {
            whereClause.customerId = sessionCustomerId;
        } else if (customerId) {
            whereClause.customerId = parseInt(customerId);
        }

        const permits = await prisma.visitPermit.findMany({
            where: whereClause,
            include: { datacenter: true, customer: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(permits);
    } catch (error) {
        console.error('Fetch Permits Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingPermit = await prisma.visitPermit.findUnique({ where: { id: parseInt(id) } });
        if (!existingPermit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (sessionCustomerId && existingPermit.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let dataToUpdate = { status };
        
        // If status is Approved and no token exists, generate one
        if (status === 'Approved' && !existingPermit.qrCodeToken) {
            dataToUpdate.qrCodeToken = crypto.randomBytes(32).toString('hex');
        }

        const updatedPermit = await prisma.visitPermit.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });

        return NextResponse.json(updatedPermit);
    } catch (error) {
        console.error('Update Permit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { datacenterId, customerId, companyName, visitorNames, activity, scheduledAt } = body;

        if (!datacenterId || !visitorNames || !activity || !scheduledAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        const newPermit = await prisma.visitPermit.create({
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: finalCustomerId,
                companyName: companyName || null,
                visitorNames,
                activity,
                scheduledAt: new Date(scheduledAt),
                status: 'Pending'
            }
        });

        return NextResponse.json(newPermit, { status: 201 });
    } catch (error) {
        console.error('Create Permit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
