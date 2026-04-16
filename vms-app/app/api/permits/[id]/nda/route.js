import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(req, { params }) {
    try {
        const { id } = params;
        const body = await req.json();
        
        // In real world, we verify the signature here.
        // For MVP, we assume the POST implies consent.

        const permitId = parseInt(id);
        const permit = await prisma.visitPermit.findUnique({
            where: { id: permitId }
        });

        if (!permit) {
            return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
        }

        if (permit.status !== 'Approved' && permit.status !== 'Pending') {
            return NextResponse.json({ error: 'Permit is not in a valid state for NDA signature' }, { status: 400 });
        }

        const qrToken = crypto.randomBytes(32).toString('hex');

        const updatedPermit = await prisma.$transaction(async (tx) => {
            const result = await tx.visitPermit.update({
                where: { id: permitId },
                data: {
                    ndaSignedAt: new Date(),
                    qrCodeToken: qrToken,
                    status: 'NDASigned',
                    // Basic default zone assignment based on activity
                    zoneAccess: ["Lobby", "Meeting_Rooms"],
                    requiresEscort: permit.activity.toLowerCase().includes('maintenance')
                }
            });

            await tx.permitEventLog.create({
                data: {
                    permitId: permitId,
                    status: 'NDASigned',
                    message: 'Visitor signed the digital NDA. QR Code generated.'
                }
            });

            return result;
        });

        return NextResponse.json({ 
            success: true, 
            message: 'NDA signed and QR Code generated.',
            qrToken: updatedPermit.qrCodeToken,
            requiresEscort: updatedPermit.requiresEscort
        });

    } catch (error) {
        console.error('NDA Endpoint Error:', error);
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
}
