import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');
        const view = searchParams.get('view'); // 'live' or 'archive'
        
        let whereClause = {};
        
        if (!isInternalAdmin) {
            // Strictly enforce isolation for non-admins
            if (!sessionCustomerId) {
                return NextResponse.json({ error: 'Forbidden: No Customer ID associated with this account' }, { status: 403 });
            }
            whereClause.customerId = sessionCustomerId;
        } else if (customerId) {
            // Admins can filter by customerId if provided
            whereClause.customerId = parseInt(customerId);
        }

        // Handle Archive vs Live view
        if (view === 'archive') {
            whereClause.status = { in: ['Checked Out', 'CheckedOut', 'Cancelled', 'Expired', 'Rejected'] };
        } else {
            // Default to live view: Pending, Approved, Check In
            whereClause.status = { notIn: ['Checked Out', 'CheckedOut', 'Cancelled', 'Expired', 'Rejected'] };
        }

        const permits = await prisma.visitPermit.findMany({
            where: whereClause,
            include: { datacenter: true, customer: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(permits);
    } catch (error) {
        console.error('Fetch Permits Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingPermit = await prisma.visitPermit.findUnique({ where: { id: parseInt(id) } });
        if (!existingPermit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (sessionCustomerId && existingPermit.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let dataToUpdate = { status };
        
        // Ensure token exists for Approved or CheckIn statuses
        if (['Approved', 'CheckIn', 'Check In'].includes(status) && !existingPermit.qrCodeToken) {
            const shortSalt = crypto.randomBytes(4).toString('hex').toUpperCase();
            dataToUpdate.qrCodeToken = `PRM-${existingPermit.id}-${shortSalt}`;
        }

        const updatedPermit = await prisma.visitPermit.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
            include: { customer: true }
        });

        if (status === 'Approved' && updatedPermit.qrCodeToken) {
            const mailConfig = await prisma.datacenterMailConfig.findUnique({
                where: { datacenterId: updatedPermit.datacenterId }
            });

            if (mailConfig?.isActive && mailConfig.notificationTriggers?.includes('permit_approved')) {
                const targetEmail = updatedPermit.customer?.contactEmail;
                if (targetEmail) {
                    try {
                        const { sendEmail } = await import('../../../lib/mailer');
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${updatedPermit.qrCodeToken}`;
                        const html = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2>Datacenter Visit Permit Approved</h2>
                                <p>Hello,</p>
                                <p>Your visit permit for <strong>${updatedPermit.visitorNames}</strong> has been approved for the scheduled activity: ${updatedPermit.activity}.</p>
                                <p>Please present the following QR Code at the Datacenter security desk upon arrival:</p>
                                <div style="margin: 20px 0; text-align: center;">
                                    <img src="${qrUrl}" alt="Permit QR Code" style="border-radius: 8px; border: 1px solid #ccc; padding: 10px;" />
                                </div>
                                <p style="font-size: 14px; font-weight: bold; text-align: center;">Token: ${updatedPermit.qrCodeToken}</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 12px; color: #888;">This is an automated message from the PRODC VMS System.</p>
                            </div>
                        `;
                        await sendEmail({
                            smtpHost: mailConfig.smtpHost,
                            smtpPort: mailConfig.smtpPort,
                            smtpUser: mailConfig.smtpUser,
                            smtpPass: mailConfig.smtpPass,
                            to: targetEmail,
                            subject: 'Datacenter Visit Permit - Approved',
                            html
                        });
                    } catch (err) {
                        console.error('Failed to send permit approval email:', err);
                    }
                }
            }
        }

        return NextResponse.json(updatedPermit);
    } catch (error) {
        console.error('Update Permit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const sessionCustomerId = session?.user?.customerId;

        const body = await req.json();
        const { datacenterId, customerId, companyName, visitorNames, activity, scheduledAt } = body;

        if (!datacenterId || !visitorNames || !activity || !scheduledAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (sessionCustomerId) {
            finalCustomerId = sessionCustomerId;
        }

        const newPermit = await prisma.visitPermit.create({
            data: {
                datacenterId: parseInt(datacenterId),
                customerId: finalCustomerId,
                companyName: companyName || null,
                visitorNames,
                activity,
                scheduledAt: new Date(scheduledAt),
                status: 'Pending'
            }
        });

        return NextResponse.json(newPermit, { status: 201 });
    } catch (error) {
        console.error('Create Permit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
