import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const sites = await prisma.dCSite.findMany();
        return NextResponse.json(sites);
    } catch (error) {
        console.error('Fetch Sites Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
