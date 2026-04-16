import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const filter = status ? { status } : {};

        const cards = await prisma.accessCard.findMany({
            where: filter,
            include: {
                currentPermit: {
                    select: { id: true, visitorNames: true, companyName: true }
                }
            },
            orderBy: { cardNumber: 'asc' }
        });

        return NextResponse.json(cards);
    } catch (error) {
        console.error('Fetch access cards error', error);
        return NextResponse.json({ error: 'Failed to fetch access cards' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { cardNumber } = await req.json();
        
        if (!cardNumber) {
            return NextResponse.json({ error: 'Card number required' }, { status: 400 });
        }

        const newCard = await prisma.accessCard.create({
            data: { cardNumber }
        });
        
        return NextResponse.json(newCard);
    } catch (error) {
        console.error('Create access card error', error);
        return NextResponse.json({ error: 'Failed to create access card' }, { status: 500 });
    }
}
