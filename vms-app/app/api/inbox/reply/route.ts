import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { messageId, replyBody } = body;

        if (!messageId || !replyBody) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Fetch the original message to get thread details & recipient
        const origMessage = await prisma.inboxMessage.findUnique({
            where: { messageId }
        });

        if (!origMessage) {
            return NextResponse.json({ error: "Original message not found" }, { status: 404 });
        }

        // Verify ACL: User belongs to this datacenter or is Super Admin
        if (session.role !== 'Super Admin' && origMessage.datacenterId !== session.datacenterId) {
            return NextResponse.json({ error: "Permission Denied for this Datacenter's Inbox" }, { status: 403 });
        }

        // Get the SMTP config for this datacenter
        const config = await prisma.datacenterMailConfig.findUnique({
            where: { datacenterId: origMessage.datacenterId }
        });

        if (!config) {
            return NextResponse.json({ error: "No Mail Config found for this Datacenter" }, { status: 404 });
        }

        // Setup Nodemailer Transporter
        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: true,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass
            }
        });

        // Send the Mail
        const info = await transporter.sendMail({
            from: `"${session.name}" <${config.smtpUser}>`, // Send as NOC user, using official email
            to: origMessage.from, // Reply back
            subject: `Re: ${origMessage.subject}`,
            inReplyTo: origMessage.messageId,
            references: [origMessage.messageId, origMessage.threadId || ''].filter(Boolean),
            text: replyBody,
            html: `<p>${replyBody.replace(/\n/g, '<br/>')}</p>
                   <br/><hr/><br/>
                   <blockquote>${origMessage.htmlContent || origMessage.bodyText}</blockquote>`
        });

        // Append a timestamp so we know it was replied to
        await prisma.inboxMessage.update({
            where: { messageId },
            data: { repliedAt: new Date() }
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
