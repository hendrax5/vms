import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { qrToken } = body;

        if (!qrToken) {
            return NextResponse.json({ error: 'QR Token is required' }, { status: 400 });
        }

        const permit = await prisma.visitPermit.findUnique({
            where: { qrCodeToken: qrToken },
            include: { customer: true, site: true }
        });

        if (!permit) {
            return NextResponse.json({ error: 'Invalid or Expired QR Token' }, { status: 404 });
        }

        if (permit.status !== 'CheckIn') {
            return NextResponse.json({ error: 'Cannot Check-Out. Visitor is not currently Checked-In.' }, { status: 400 });
        }

        const now = new Date();

        // Process Check-out
        const updatedPermit = await prisma.$transaction(async (tx) => {
            const res = await tx.visitPermit.update({
                where: { id: permit.id },
                data: {
                    status: 'CheckOut',
                    checkOutAt: now
                }
            });

            await tx.permitEventLog.create({
                data: {
                    permitId: permit.id,
                    status: 'CheckOut',
                    message: 'Visitor scanned QR at Kiosk and checked out of the premises.'
                }
            });

            return res;
        });

        return NextResponse.json({
            success: true,
            visitor: updatedPermit.visitorNames,
            message: 'Check-Out Successful. Please collect your ID card.'
        });

    } catch (error) {
        console.error('Check-out Validation Error:', error);
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
}
