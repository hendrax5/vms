import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const { cardId } = await req.json();

        if (!cardId) {
            return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
        }

        const card = await prisma.accessCard.findUnique({ where: { id: parseInt(cardId) } });
        if (!card || card.status !== 'InUse' || !card.currentPermitId) {
            return NextResponse.json({ error: 'Card varies from In Use state or not found.' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.accessCard.update({
                where: { id: parseInt(cardId) },
                data: {
                    status: 'Available',
                    currentPermitId: null
                }
            });

            await tx.permitEventLog.create({
                data: {
                    permitId: card.currentPermitId,
                    status: 'CardReleased',
                    message: `Visitor successfully returned Access Card: ${card.cardNumber}. ID Card given back.`
                }
            });
        });

        return NextResponse.json({ success: true, message: 'Card Released Successfully' });

    } catch (error) {
        console.error('Release Card Error:', error);
        return NextResponse.json({ error: 'Failed to release card' }, { status: 500 });
    }
}
