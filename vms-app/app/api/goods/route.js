import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');

        const where = customerId ? { customerId: parseInt(customerId) } : {};

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
        const body = await req.json();
        
        // Add customer ID to payload
        const payload = {
            ...body,
            qrCode: body.qrCode || `GDS-${Math.random().toString(36).substring(7).toUpperCase()}`,
            status: body.status || 'Inbound'
        };

        const data = await prisma.goodsItem.create({ data: payload });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
