import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
