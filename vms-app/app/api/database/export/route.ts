import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).role !== 'Super Admin') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        // Fetch all data from database
        const data = {
            // Security
            Role: await prisma.role.findMany(),
            Permission: await prisma.permission.findMany(),
            RolePermission: await prisma.rolePermission.findMany(),
            User: await prisma.user.findMany(),
            UserPermission: await prisma.userPermission.findMany(),

            // Multi-Datacenter Spatial Hierarchy
            Region: await prisma.region.findMany(),
            Datacenter: await prisma.datacenter.findMany(),
            DataRoom: await prisma.dataRoom.findMany(),
            Row: await prisma.row.findMany(),
            Rack: await prisma.rack.findMany(),

            // Enterprise Inventory & Devices
            Customer: await prisma.customer.findMany(),
            RackEquipment: await prisma.rackEquipment.findMany(),
            InfrastructureAuditLog: await prisma.infrastructureAuditLog.findMany(),
            EquipmentPort: await prisma.equipmentPort.findMany(),
            GoodsItem: await prisma.goodsItem.findMany(),

            // VMS Core
            VisitPermit: await prisma.visitPermit.findMany(),
            PermitEventLog: await prisma.permitEventLog.findMany(),

            // Path Mapping & Logistics
            CrossConnect: await prisma.crossConnect.findMany(),
            InterconnectionProvider: await prisma.interconnectionProvider.findMany(),
            VendorMaintenance: await prisma.vendorMaintenance.findMany({ include: { affectedRacks: true } }),
            AccessCard: await prisma.accessCard.findMany(),

            // Security Audit
            ApiLog: await prisma.apiLog.findMany(),
            SystemAuditLog: await prisma.systemAuditLog.findMany(),

            // SLA & Support Tickets
            SupportTicket: await prisma.supportTicket.findMany(),
            TicketComment: await prisma.ticketComment.findMany(),

            // Unified Inbox & Mail Automation
            DatacenterMailConfig: await prisma.datacenterMailConfig.findMany(),
            InboxMessage: await prisma.inboxMessage.findMany(),
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Database Export Error:', error);
        return NextResponse.json({ error: 'Failed to export database' }, { status: 500 });
    }
}
