import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const { permitId, cardId } = await req.json();

        if (!permitId || !cardId) {
            return NextResponse.json({ error: 'permitId and cardId are required' }, { status: 400 });
        }

        const card = await prisma.accessCard.findUnique({ where: { id: parseInt(cardId) } });
        if (!card || card.status !== 'Available') {
            return NextResponse.json({ error: 'Card not found or is currently In Use' }, { status: 400 });
        }

        const permit = await prisma.visitPermit.findUnique({ where: { id: parseInt(permitId) } });
        if (!permit || permit.status !== 'CheckIn') {
            return NextResponse.json({ error: 'Visitor must be Checked-In to receive an access card' }, { status: 400 });
        }

        // Atomic transaction: assign card and log
        await prisma.$transaction(async (tx) => {
            await tx.accessCard.update({
                where: { id: parseInt(cardId) },
                data: {
                    status: 'InUse',
                    currentPermitId: parseInt(permitId)
                }
            });

            await tx.permitEventLog.create({
                data: {
                    permitId: parseInt(permitId),
                    status: 'CardAssigned',
                    message: `Visitor assigned Access Card: ${card.cardNumber}. ID Card retained at security desk.`
                }
            });
        });

        return NextResponse.json({ success: true, message: 'Card Assigned Successfully' });

    } catch (error) {
        console.error('Assign Card Error:', error);
        return NextResponse.json({ error: 'Failed to assign card' }, { status: 500 });
    }
}
