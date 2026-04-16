import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRoleRaw = (session?.user as any)?.role as string || '';
        const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
        const userPermissions = (session?.user as any)?.permissions || [];

        if (!isSuperAdmin && !userPermissions.includes('users:manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            include: {
                role: true,
                datacenter: true,
                customer: true,
            },
            orderBy: { id: 'asc' }
        });

        // Exclude passwords
        const safeUsers = users.map(u => {
            const { password, ...safeUser } = u;
            return safeUser;
        });

        return NextResponse.json(safeUsers, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRoleRaw = (session?.user as any)?.role as string || '';
        const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
        const userPermissions = (session?.user as any)?.permissions || [];

        if (!isSuperAdmin && !userPermissions.includes('users:manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, roleId, customerId, datacenterId } = body;

        if (!email || !roleId) {
            return NextResponse.json({ error: 'Email and roleId are required.' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                name: name || '',
                password: password || 'password123',
                roleId: parseInt(roleId),
                ...(customerId ? { customerId: parseInt(customerId) } : {}),
                ...(datacenterId ? { datacenterId: parseInt(datacenterId) } : {}),
            }
        });

        return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
