import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');
        
        let whereClause = {};
        if (customerId) whereClause.customerId = parseInt(customerId);

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
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const updatedPermit = await prisma.visitPermit.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        return NextResponse.json(updatedPermit);
    } catch (error) {
        console.error('Update Permit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { datacenterId, customerId, companyName, visitorNames, activity, scheduledAt } = body;

        if (!datacenterId || !visitorNames || !activity || !scheduledAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newPermit = await prisma.visitPermit.create({
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: customerId ? parseInt(customerId) : null,
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
