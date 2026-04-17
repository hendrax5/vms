import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(req) {
    let body;
    try {
        body = await req.json();
        const { qrToken, visitorPhoto, validateOnly } = body;

        const session = await getServerSession(authOptions);
        const operatorId = session?.user?.id ? parseInt(session.user.id) : null;

        if (!qrToken) {
            return NextResponse.json({ error: 'QR Token is required' }, { status: 400 });
        }

        // 1. Try to find as a Visit Permit
        const permit = await prisma.visitPermit.findUnique({
            where: { qrCodeToken: qrToken },
            include: { customer: true, datacenter: true }
        });

        if (permit) {
            if (permit.status === 'CheckIn' && !validateOnly) {
                return NextResponse.json({ error: 'Visitor is already checked in' }, { status: 400 });
            }

            if (validateOnly) {
                return NextResponse.json({
                    success: true,
                    type: 'PERMIT',
                    permitId: permit.id,
                    visitorNames: permit.visitorNames,
                    status: permit.status,
                    datacenter: permit.datacenter?.name
                });
            }

            if (permit.status !== 'NDASigned' && permit.status !== 'Approved') {
                return NextResponse.json({ error: 'Permit is not ready for Check In (Ensure permit is Approved)' }, { status: 400 });
            }

            // Validate time
            const now = new Date();
            const scheduled = new Date(permit.scheduledAt);
            
            // Allow check-in anytime on the same calendar day
            const isSameDay = now.toDateString() === scheduled.toDateString();
            
            if (!isSameDay) {
                const timeDiffMins = (scheduled.getTime() - now.getTime()) / 60000;
                
                // Don't allow check-ins more than 2 hours early for future days
                if (timeDiffMins > 120) {
                    return NextResponse.json({ 
                        error: `Check-in is too early. Your permit is scheduled for ${scheduled.toLocaleDateString()} at ${scheduled.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.` 
                    }, { status: 403 });
                }

                // If it's a past day, it's expired
                if (timeDiffMins < -1440) { // More than 24 hours late
                    return NextResponse.json({ error: 'Permit has expired. Please schedule a new visit.' }, { status: 403 });
                }
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

                // CREATE SYSTEM AUDIT LOG FOR DC TEAM NOTIFICATION
                await tx.systemAuditLog.create({
                    data: {
                        userId: operatorId,
                        action: 'KIOSK_CHECKIN',
                        resource: `VisitPermit PRM-${permit.id}`,
                        details: `Visitor: ${permit.visitorNames} | Company: ${permit.customer?.name || permit.companyName} | DC: ${permit.datacenter?.name}`,
                    }
                });

                return res;
            });

            return NextResponse.json({
                success: true,
                type: 'PERMIT',
                visitor: updatedPermit.visitorNames,
                message: 'Check-In Successful. Proceed to assigned zones.'
            });
        }

        // 2. Try to find as a Goods Item
        const goods = await prisma.goodsItem.findUnique({
            where: { qrCode: qrToken },
            include: { customer: true, datacenter: true }
        });

        if (goods) {
            const now = new Date();
            const updatedGoods = await prisma.$transaction(async (tx) => {
                const res = await tx.goodsItem.update({
                    where: { id: goods.id },
                    data: {
                        status: 'CheckedIn',
                        scannedAt: now
                    }
                });

                // CREATE SYSTEM AUDIT LOG FOR DC TEAM NOTIFICATION
                await tx.systemAuditLog.create({
                    data: {
                        userId: operatorId,
                        action: 'GOODS_SCAN',
                        resource: `GoodsItem ${goods.qrCode}`,
                        details: `Item: ${goods.name} | Status: ${goods.status} -> CheckedIn | Company: ${goods.customer?.name} | DC: ${goods.datacenter?.name}`,
                    }
                });

                return res;
            });

            return NextResponse.json({
                success: true,
                type: 'GOODS',
                itemName: updatedGoods.name,
                message: `Logistics Item ${updatedGoods.qrCode} has been verified at the kiosk.`
            });
        }

        // 3. Not found
        return NextResponse.json({ error: 'Invalid or Expired QR Token' }, { status: 404 });

    } catch (error) {
        console.error('Check-in Validation Error Details:', {
            message: error.message,
            stack: error.stack,
            body: body
        });
        return NextResponse.json({ 
            error: 'Server configuration error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
