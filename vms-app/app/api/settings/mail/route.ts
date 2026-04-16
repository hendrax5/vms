import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Get the config for the current user's Datacenter
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const dcId = searchParams.get('datacenterId');
        let targetDcId = session.datacenterId; 
        
        if (session.role === 'Super Admin' && dcId) targetDcId = parseInt(dcId);

        if (!targetDcId) return NextResponse.json({ config: null });

        const config = await prisma.datacenterMailConfig.findUnique({
            where: { datacenterId: targetDcId }
        });

        // Hide passwords for security before returning to frontend
        if (config) {
            config.imapPass = '***HIDDEN***';
            config.smtpPass = '***HIDDEN***';
        }

        return NextResponse.json({ config });
    } catch (e: any) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Upsert the config
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.role !== 'Super Admin' && session.role !== 'NOC Manager')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { datacenterId, imapHost, imapPort, imapUser, imapPass, smtpHost, smtpPort, smtpUser, smtpPass, isActive } = body;

        let targetDcId = session.datacenterId; 
        if (session.role === 'Super Admin' && datacenterId) targetDcId = parseInt(datacenterId);

        if (!targetDcId) return NextResponse.json({ error: "Context Datacenter Missing" }, { status: 400 });

        // Retrieve existing logic if pass is hidden
        const existingConfig = await prisma.datacenterMailConfig.findUnique({ where: { datacenterId: targetDcId }});
        
        const actualImapPass = (imapPass === '***HIDDEN***') ? existingConfig?.imapPass : imapPass;
        const actualSmtpPass = (smtpPass === '***HIDDEN***') ? existingConfig?.smtpPass : smtpPass;

        if (!actualImapPass || !actualSmtpPass) {
            return NextResponse.json({ error: "Both IMAP and SMTP passwords are required for a new setup" }, { status: 400 });
        }

        const config = await prisma.datacenterMailConfig.upsert({
            where: { datacenterId: targetDcId },
            update: {
                imapHost, imapPort: parseInt(imapPort.toString()), imapUser, imapPass: actualImapPass,
                smtpHost, smtpPort: parseInt(smtpPort.toString()), smtpUser, smtpPass: actualSmtpPass,
                isActive: Boolean(isActive)
            },
            create: {
                datacenterId: targetDcId,
                imapHost, imapPort: parseInt(imapPort.toString()), imapUser, imapPass: actualImapPass,
                smtpHost, smtpPort: parseInt(smtpPort.toString()), smtpUser, smtpPass: actualSmtpPass,
                isActive: Boolean(isActive)
            }
        });

        return NextResponse.json({ config });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
