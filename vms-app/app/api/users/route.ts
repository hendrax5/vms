import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRoleRaw = (session?.user as any)?.role as string || '';
        const userRoleLower = userRoleRaw.replace(/\s+/g, '').toLowerCase();
        const isSuperAdmin = userRoleLower === 'superadmin';
        const isTenantAdmin = userRoleLower.includes('admin') && userRoleLower.includes('tenant');
        const userPermissions = (session?.user as any)?.permissions || [];

        if (!isSuperAdmin && !isTenantAdmin && !userPermissions.includes('users:manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const sessionCustomerId = (session?.user as any)?.customerId;

        const users = await prisma.user.findMany({
            where: sessionCustomerId ? { customerId: sessionCustomerId } : {},
            include: {
                role: true,
                datacenter: true,
                customer: true,
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });

        // Exclude passwords
        const safeUsers = users.map(u => {
            const { password, permissions, ...safeUser } = u;
            return {
                ...safeUser,
                explicitPermissions: permissions.map(p => p.permission.key)
            };
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
        const userRoleLower = userRoleRaw.replace(/\s+/g, '').toLowerCase();
        const isSuperAdmin = userRoleLower === 'superadmin';
        const isTenantAdmin = userRoleLower.includes('admin') && userRoleLower.includes('tenant');
        const userPermissions = (session?.user as any)?.permissions || [];

        if (!isSuperAdmin && !isTenantAdmin && !userPermissions.includes('users:manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, name, roleId, customerId, datacenterId } = body;

        if (!email || !roleId) {
            return NextResponse.json({ error: 'Email and roleId are required.' }, { status: 400 });
        }

        const sessionCustomerId = (session?.user as any)?.customerId;

        // Determine final customerId
        let finalCustomerId = customerId ? parseInt(customerId) : undefined;
        if (sessionCustomerId) {
            // Tenant admins MUST only create users in their own tenant
            finalCustomerId = sessionCustomerId;

            // Security check: Verify that the selected role is a "Tenant" role
            const requestedRole = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
            if (!requestedRole || !requestedRole.name.toLowerCase().includes('tenant')) {
                return NextResponse.json({ error: 'Forbidden. Tenants can only assign Tenant roles.' }, { status: 403 });
            }
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password || 'password123', 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                name: name || '',
                password: hashedPassword,
                roleId: parseInt(roleId),
                ...(finalCustomerId ? { customerId: finalCustomerId } : {}),
                ...(datacenterId ? { datacenterId: parseInt(datacenterId) } : {}),
            }
        });

        return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
