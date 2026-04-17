import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function DELETE(req, { params }) {
    const { id } = params;

    try {
        const parsedId = parseInt(id);

        const role = await prisma.role.findUnique({
            where: { id: parsedId }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        if (role.name === 'Super Admin') {
            return NextResponse.json({ error: 'Cannot delete Super Admin role' }, { status: 403 });
        }

        await prisma.role.delete({
            where: { id: parsedId }
        });

        // Audit Log
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id ? parseInt(session.user.id) : null;
        const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
        await prisma.systemAuditLog.create({
            data: {
                action: 'DELETE_ROLE',
                resource: 'Role',
                details: JSON.stringify({ roleId: parsedId, roleName: role.name }),
                ipAddress: ipAddress,
                userId: userId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Role Error:', error);
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}
