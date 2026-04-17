import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
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

        const userId = parseInt(params.id);

        if ((session.user as any).id === userId) {
            return NextResponse.json({ error: 'You cannot delete yourself.' }, { status: 400 });
        }

        const sessionCustomerId = (session?.user as any)?.customerId;
        
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (sessionCustomerId && targetUser.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden. You can only manage users in your own tenant.' }, { status: 403 });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
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

        const userId = parseInt(params.id);
        const body = await request.json();
        const { roleId, permissions, password, customerId } = body;

        const sessionCustomerId = (session?.user as any)?.customerId;
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (sessionCustomerId && targetUser.customerId !== sessionCustomerId) {
            return NextResponse.json({ error: 'Forbidden. You can only manage users in your own tenant.' }, { status: 403 });
        }

        let updateData: any = {};
        if (roleId) {
            const parsedRoleId = parseInt(roleId);
            if (sessionCustomerId) {
                // Verify the requested role is a Tenant role
                const requestedRole = await prisma.role.findUnique({ where: { id: parsedRoleId } });
                if (!requestedRole || !requestedRole.name.toLowerCase().includes('tenant')) {
                    return NextResponse.json({ error: 'Forbidden. Tenants can only assign Tenant roles.' }, { status: 403 });
                }
            }
            updateData.roleId = parsedRoleId;
        }

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (sessionCustomerId) {
            // Force customerId to be their own, ignore the payload
            updateData.customerId = sessionCustomerId;
        } else if (customerId !== undefined) {
            updateData.customerId = customerId ? parseInt(customerId) : null;
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: updateData
            });
        }

        if (Array.isArray(permissions)) {
            // Unassign all explicit user-level permissions first
            await prisma.userPermission.deleteMany({
                where: { userId: userId }
            });

            if (permissions.length > 0) {
                const permRecords = await prisma.permission.findMany({
                    where: { key: { in: permissions } }
                });
                const inserts = permRecords.map(p => ({
                    userId,
                    permissionId: p.id
                }));
                await prisma.userPermission.createMany({
                    data: inserts
                });
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Update User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
