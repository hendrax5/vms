import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let sessionDcId = (session.user as any)?.datacenterId;
        if (!sessionDcId) {
            const firstDc = await prisma.datacenter.findFirst();
            if (firstDc) sessionDcId = firstDc.id;
        }

        if (!sessionDcId) {
            return NextResponse.json({ error: "No datacenter context" }, { status: 400 });
        }

        // Fetch active permits that are currently inside
        const activePermits = await prisma.visitPermit.findMany({
            where: {
                datacenterId: parseInt(sessionDcId),
                status: {
                    in: ['CheckedIn', 'KioskVerified']
                }
            },
            include: {
                customer: true
            },
            orderBy: {
                checkInAt: 'desc'
            }
        });

        // Format for kiosk UI
        const formatted = activePermits.map(permit => ({
            id: permit.id,
            qrToken: permit.qrCodeToken,
            visitorNames: permit.visitorNames,
            companyName: permit.customer?.name || permit.companyName || "External Visitor",
            checkInAt: permit.checkInAt,
            status: permit.status
        }));

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Fetch Active Visitors Error:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
