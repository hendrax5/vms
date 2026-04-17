import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function DELETE(req, { params }) {
    const { id } = params;

    try {
        const parsedId = parseInt(id);
        const permission = await prisma.permission.findUnique({
            where: { id: parsedId }
        });

        if (permission) {
            await prisma.permission.delete({
                where: { id: parsedId }
            });

            // Audit Log
            const session = await getServerSession(authOptions);
            const userId = session?.user?.id ? parseInt(session.user.id) : null;
            const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
            await prisma.systemAuditLog.create({
                data: {
                    action: 'DELETE_PERMISSION',
                    resource: 'Permission',
                    details: JSON.stringify({ permissionId: parsedId, key: permission.key }),
                    ipAddress: ipAddress,
                    userId: userId
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Permission Error:', error);
        return NextResponse.json({ error: 'Failed to delete permission' }, { status: 500 });
    }
}
