import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).roleName !== 'Super Admin') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        const data = await req.json();
        
        // Define topological order for insertion to avoid Foreign Key constraint errors
        const order = [
            'Permission', 'Role', 'Region', 'Customer',
            'Datacenter', 'DataRoom', 'Row', 'Rack',
            'User', 'RolePermission', 'UserPermission',
            'RackEquipment', 'EquipmentPort', 'InterconnectionProvider',
            'GoodsItem', 'VisitPermit', 'PermitEventLog', 'CrossConnect',
            'AccessCard', 'SupportTicket', 'TicketComment',
            'DatacenterMailConfig', 'InboxMessage',
            'VendorMaintenance', 'ApiLog', 'SystemAuditLog', 'InfrastructureAuditLog'
        ];

        const summary: Record<string, { attempted: number, count: number }> = {};

        for (const modelName of order) {
            const records = data[modelName];
            if (!records || !Array.isArray(records) || records.length === 0) continue;

            // Remove relations that can't be inserted via createMany (like implicit M2M)
            const cleanedRecords = records.map((record: any) => {
                const cleaned = { ...record };
                if (modelName === 'VendorMaintenance') delete cleaned.affectedRacks;
                // Parse date strings back to Date objects if needed, but Prisma usually handles ISO strings directly.
                return cleaned;
            });

            // Delegate name is lowercase first letter of model (e.g. 'Role' -> 'role')
            const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            const delegate = (prisma as any)[delegateName];
            
            if (delegate) {
                const result = await delegate.createMany({
                    data: cleanedRecords,
                    skipDuplicates: true // Skips if unique constraint fails
                });
                
                summary[modelName] = { attempted: records.length, count: result.count };
                
                // Attempt to fix PostgreSQL sequence issues after explicit ID inserts
                try {
                     await prisma.$executeRawUnsafe(`SELECT setval('"${modelName}_id_seq"', coalesce(max(id), 0) + 1, false) FROM "${modelName}";`);
                } catch(e) {
                     // Ignore, some tables might not have an auto-incrementing ID or sequence name is different
                }
            }
        }

        return NextResponse.json({ success: true, summary });
    } catch (error) {
        console.error('Database Import Error:', error);
        return NextResponse.json({ error: 'Failed to import database: ' + (error as any).message }, { status: 500 });
    }
}
