import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const operatorId = session.user?.id ? parseInt(session.user.id) : null;
        const sessionDcId = (session.user as any)?.datacenterId;

        const body = await request.json();
        const { visitorName, companyName, activity, customerId, visitorPhoto } = body;

        if (!visitorName || !activity || !sessionDcId) {
            return NextResponse.json({ error: "Missing required fields or datacenter context" }, { status: 400 });
        }

        // Generate a random token for the QR
        const shortSalt = crypto.randomBytes(4).toString('hex').toUpperCase();

        const newPermit = await prisma.visitPermit.create({
            data: {
                datacenterId: parseInt(sessionDcId),
                customerId: customerId ? parseInt(customerId) : null,
                companyName: companyName || null,
                visitorNames: visitorName,
                activity: activity,
                scheduledAt: new Date(),
                checkInAt: new Date(),
                status: 'KioskVerified', // Represents checked-in via kiosk
                visitorPhoto: visitorPhoto || null,
                // We add the QR token immediately
                qrCodeToken: `WALKIN-${Date.now()}-${shortSalt}`
            }
        });

        // Update the token to include the DB ID
        const finalToken = `PRM-${newPermit.id}-${shortSalt}`;
        await prisma.visitPermit.update({
            where: { id: newPermit.id },
            data: { qrCodeToken: finalToken }
        });

        // Add to logbook
        await prisma.permitEventLog.create({
            data: {
                permitId: newPermit.id,
                status: 'KioskVerified',
                message: 'Walk-in visitor registered and checked-in via Kiosk.'
            }
        });

        // System Audit
        await prisma.systemAuditLog.create({
            data: {
                userId: operatorId,
                action: 'KIOSK_WALKIN_REGISTER',
                resource: `VisitPermit PRM-${newPermit.id}`,
                details: `Visitor: ${visitorName} | DC: ${sessionDcId}`
            }
        });

        // Note: For walk-ins, we might not send an email since they are already checked in at the physical location,
        // but if required, we can hook into lib/mailer here.

        return NextResponse.json({ success: true, permitId: newPermit.id, qrToken: finalToken, visitor: visitorName });

    } catch (error: any) {
        console.error('Walk-in Registration Error:', error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
