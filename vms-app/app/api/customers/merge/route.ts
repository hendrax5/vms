import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userRoleRaw = (session?.user as any)?.role as string || '';
        const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
        const userPermissions = (session?.user as any)?.permissions || [];

        // Assuming merging tenants requires manage access to system/users or is restricted to superadmin.
        // We'll restrict to superadmin for safety since it's a destructive global operation.
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Only Superadmins can merge tenants.' }, { status: 403 });
        }

        const body = await request.json();
        const { sourceId, targetId } = body;

        if (!sourceId || !targetId) {
            return NextResponse.json({ error: 'Both Source and Target Tenant IDs are required.' }, { status: 400 });
        }

        if (sourceId === targetId) {
            return NextResponse.json({ error: 'Source and Target cannot be the same Tenant.' }, { status: 400 });
        }

        const sourceIdInt = parseInt(sourceId);
        const targetIdInt = parseInt(targetId);

        const sourceCustomer = await prisma.customer.findUnique({ where: { id: sourceIdInt } });
        const targetCustomer = await prisma.customer.findUnique({ where: { id: targetIdInt } });

        if (!sourceCustomer || !targetCustomer) {
            return NextResponse.json({ error: 'One or both Tenants do not exist.' }, { status: 404 });
        }

        // Execute merge in a transaction
        await prisma.$transaction([
            prisma.rack.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.rackEquipment.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.crossConnect.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.visitPermit.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.goodsItem.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.supportTicket.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            prisma.user.updateMany({ where: { customerId: sourceIdInt }, data: { customerId: targetIdInt } }),
            
            // Log the action
            prisma.systemAuditLog.create({
                data: {
                    userId: parseInt((session.user as any).id),
                    action: 'MERGE_TENANT',
                    resource: 'Customer',
                    details: `Merged tenant ${sourceCustomer.name} (ID: ${sourceIdInt}) into ${targetCustomer.name} (ID: ${targetIdInt})`,
                }
            }),

            // Finally delete the source customer
            prisma.customer.delete({ where: { id: sourceIdInt } })
        ]);

        return NextResponse.json({ success: true, message: `Successfully merged ${sourceCustomer.name} into ${targetCustomer.name}` }, { status: 200 });
    } catch (error: any) {
        console.error('Merge Tenant Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
