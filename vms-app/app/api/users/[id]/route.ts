import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRoleRaw = (session?.user as any)?.role as string || '';
        const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
        const userPermissions = (session?.user as any)?.permissions || [];

        if (!isSuperAdmin && !userPermissions.includes('users:manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const userId = parseInt(params.id);

        if ((session.user as any).id === userId) {
            return NextResponse.json({ error: 'You cannot delete yourself.' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
