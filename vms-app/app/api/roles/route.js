import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });
        
        // Transform the payload slightly to make rendering easier
        const formattedRoles = roles.map(role => ({
            id: role.id,
            name: role.name,
            permissions: role.permissions.map(rp => rp.permission.key)
        }));

        return NextResponse.json(formattedRoles);
    } catch (error) {
        console.error('Fetch Roles Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { roleId, permissions, action, name } = body; 

        // Handle Role Creation
        if (action === 'create') {
            if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
            const existing = await prisma.role.findUnique({ where: { name } });
            if (existing) return NextResponse.json({ error: 'Role already exists' }, { status: 400 });
            
            const newRole = await prisma.role.create({ data: { name } });
            return NextResponse.json({ success: true, role: newRole });
        }

        // Handle Permission Assignment
        if (!roleId || !Array.isArray(permissions)) {
             return NextResponse.json({ error: 'Missing roleId or permissions array' }, { status: 400 });
        }

        // Prevent wiping out Super Admin entirely
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        
        if (role.name === 'Super Admin' && permissions.length === 0) {
            return NextResponse.json({ error: 'Cannot remove all permissions from Super Admin' }, { status: 403 });
        }

        // 1. Delete all existing permissions for this role
        await prisma.rolePermission.deleteMany({
            where: { roleId: roleId }
        });

        // 2. Fetch the corresponding permission IDs for the keys
        const permRecords = await prisma.permission.findMany({
            where: { key: { in: permissions } }
        });

        const permIds = permRecords.map(p => p.id);

        // 3. Re-insert
        if (permIds.length > 0) {
            const dataToInsert = permIds.map(pid => ({
                roleId: roleId,
                permissionId: pid
            }));
            await prisma.rolePermission.createMany({
                data: dataToInsert
            });
        }

        return NextResponse.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Update Role Permissions Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', msg: error.message }, { status: 500 });
    }
}
