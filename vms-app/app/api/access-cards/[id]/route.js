import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req, { params }) {
    try {
        const id = parseInt(params.id);
        
        // Check if card is in use
        const card = await prisma.accessCard.findUnique({
            where: { id },
            include: { currentPermit: true }
        });

        if (!card) {
            return NextResponse.json({ error: 'Card not found' }, { status: 404 });
        }

        if (card.status === 'InUse' || card.currentPermitId) {
            return NextResponse.json({ error: 'Cannot delete a card that is currently in use' }, { status: 400 });
        }

        await prisma.accessCard.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete access card error', error);
        return NextResponse.json({ error: 'Failed to delete access card' }, { status: 500 });
    }
}
