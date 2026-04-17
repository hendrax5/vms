import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { qrToken, visitorPhoto } = body;

        if (!qrToken) {
            return NextResponse.json({ error: 'QR Token is required' }, { status: 400 });
        }

        const permit = await prisma.visitPermit.findUnique({
            where: { qrCodeToken: qrToken },
            include: { customer: true, datacenter: true }
        });

        if (!permit) {
            // Security metric point: Invalid QR attempt
            return NextResponse.json({ error: 'Invalid or Expired QR Token' }, { status: 404 });
        }

        if (permit.status === 'CheckIn') {
            return NextResponse.json({ error: 'Visitor is already checked in' }, { status: 400 });
        }

        if (permit.status !== 'NDASigned' && permit.status !== 'Approved') {
            return NextResponse.json({ error: 'Permit is not ready for Check In (Ensure NDA is signed or permit is Approved)' }, { status: 400 });
        }

        // Validate time
        const now = new Date();
        const scheduled = new Date(permit.scheduledAt);
        const timeDiffMins = (scheduled.getTime() - now.getTime()) / 60000;

        // E.g., don't allow check-ins more than 2 hours early
        if (timeDiffMins > 120) {
            return NextResponse.json({ error: 'Check-in is too early. Please return closer to your scheduled time.' }, { status: 403 });
        }

        // Process Check-in
        const updatedPermit = await prisma.$transaction(async (tx) => {
            const res = await tx.visitPermit.update({
                where: { id: permit.id },
                data: {
                    status: 'CheckIn',
                    checkInAt: now,
                    ...(visitorPhoto && { visitorPhoto })
                }
            });

            await tx.permitEventLog.create({
                data: {
                    permitId: permit.id,
                    status: 'CheckIn',
                    message: visitorPhoto ? 'Visitor verified QR and registered identity photo at Kiosk.' : 'Visitor verified QR and checked in.',
                }
            });

            return res;
        });

        return NextResponse.json({
            success: true,
            visitor: updatedPermit.visitorNames,
            zoneAccess: updatedPermit.zoneAccess,
            requiresEscort: updatedPermit.requiresEscort,
            message: 'Check-In Successful. Proceed to assigned zones.'
        });

    } catch (error) {
        console.error('Check-in Validation Error:', error);
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
}
