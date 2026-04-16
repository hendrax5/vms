import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const datacenterId = searchParams.get('datacenterId');

        const whereClause = {};
        if (datacenterId) {
            // Get global providers (null) and DC specific
            whereClause.OR = [
                { datacenterId: null },
                { datacenterId: parseInt(datacenterId) }
            ];
        }

        const providers = await prisma.interconnectionProvider.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(providers);
    } catch (error) {
        console.error('Fetch Providers Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, type, datacenterId } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const provider = await prisma.interconnectionProvider.create({
            data: {
                name,
                type,
                datacenterId: datacenterId ? parseInt(datacenterId) : null
            }
        });

        return NextResponse.json(provider, { status: 201 });
    } catch (error) {
        console.error('Create Provider Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await prisma.interconnectionProvider.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Provider Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
