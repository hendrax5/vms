import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dcId = searchParams.get('datacenterId');
        
        const userRole = (session?.user as any)?.role || '';
        let targetDcId = (session?.user as any)?.datacenterId; 
        
        // If super admin forces a specific DC
        if (userRole === 'Super Admin' && dcId) {
            targetDcId = parseInt(dcId);
        }

        if (!targetDcId) {
            return NextResponse.json({ emails: [] });
        }

        const emails = await prisma.inboxMessage.findMany({
            where: {
                datacenterId: targetDcId
            },
            orderBy: {
                receivedAt: 'desc'
            },
            take: 100
        });

        return NextResponse.json({ emails });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
