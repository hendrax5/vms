import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const equipmentId = parseInt(resolvedParams.id);
        const { uStart, uEnd, orientation, rackId, name } = await req.json();

        // Fetch existing configuration for Audit Logs
        const existingEq = await prisma.rackEquipment.findUnique({
            where: { id: equipmentId },
            include: { rack: true }
        });

        if (!existingEq) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

        // --- RBAC AUTHORIZATION ---
        const userRole = ((session.user as any)?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const isTenantAdmin = ['tenantadmin', 'tenantstaff'].includes(userRole);
        
        if (!isInternalAdmin) {
            if (!isTenantAdmin) {
                return NextResponse.json({ error: 'Forbidden. Read-Only users cannot edit equipment.' }, { status: 403 });
            }
            if (existingEq.rack?.customerId !== Number((session.user as any).customerId)) {
                return NextResponse.json({ error: 'Forbidden. You do not own the rack this equipment is in.' }, { status: 403 });
            }
        }
        // -------------------------

        // Calculate if position actually changed
        let isRelocated = false;
        if (
            (uStart !== undefined && existingEq.uStart !== uStart) ||
            (uEnd !== undefined && existingEq.uEnd !== uEnd) ||
            (orientation !== undefined && existingEq.orientation !== orientation) ||
            (rackId !== undefined && existingEq.rackId !== rackId)
        ) {
            isRelocated = true;
        }

        const updateData: any = {};
        if (uStart !== undefined) updateData.uStart = uStart;
        if (uEnd !== undefined) updateData.uEnd = uEnd;
        if (orientation !== undefined) updateData.orientation = orientation;
        if (rackId !== undefined) updateData.rackId = rackId;
        if (name !== undefined) updateData.name = name;

        // Perform Update
        const updated = await prisma.rackEquipment.update({
            where: { id: equipmentId },
            data: updateData
        });

        // Push to Audit Log if relocated
        if (isRelocated) {
             await prisma.infrastructureAuditLog.create({
                 data: {
                     equipmentId: equipmentId,
                     userId: parseInt((session.user as any).id),
                     action: 'RELOCATE',
                     previousState: JSON.stringify({
                         uStart: existingEq.uStart,
                         uEnd: existingEq.uEnd,
                         orientation: existingEq.orientation,
                         rackId: existingEq.rackId
                     }),
                     newState: JSON.stringify({
                         uStart: updated.uStart,
                         uEnd: updated.uEnd,
                         orientation: updated.orientation,
                         rackId: updated.rackId
                     })
                 }
             });
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update Equipment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const equipmentId = parseInt(resolvedParams.id);

        const existingEq = await prisma.rackEquipment.findUnique({
            where: { id: equipmentId },
            include: { rack: true }
        });

        if (!existingEq) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

        // --- RBAC AUTHORIZATION ---
        const userRole = ((session.user as any)?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const isTenantAdmin = ['tenantadmin', 'tenantstaff'].includes(userRole);
        
        if (!isInternalAdmin) {
            if (!isTenantAdmin) {
                return NextResponse.json({ error: 'Forbidden. Read-Only users cannot delete equipment.' }, { status: 403 });
            }
            if (existingEq.rack?.customerId !== Number((session.user as any).customerId)) {
                return NextResponse.json({ error: 'Forbidden. You do not own the rack this equipment is in.' }, { status: 403 });
            }
        }
        // -------------------------

        await prisma.infrastructureAuditLog.create({
             data: {
                 equipmentId: equipmentId,
                 userId: parseInt((session.user as any).id),
                 action: 'UNINSTALL',
                 previousState: JSON.stringify({
                     name: existingEq.name,
                     uStart: existingEq.uStart,
                     uEnd: existingEq.uEnd,
                     rackId: existingEq.rackId
                 }),
                 newState: null
             }
        });

        await prisma.rackEquipment.delete({
            where: { id: equipmentId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Equipment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
