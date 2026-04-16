import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('Rolling back recent duplicated imports...');
    const recentDate = new Date(Date.now() - 30 * 60000); // 30 minutes ago

    // Find all racks created in the last 30 minutes (during the last import run)
    const recentRacks = await prisma.rack.findMany({
        where: {
            createdAt: {
                gte: recentDate
            }
        }
    });

    if (recentRacks.length > 0) {
        console.log(`Found ${recentRacks.length} duplicated racks. Deleting...`);
        const rackIds = recentRacks.map(r => r.id);
        
        // Delete Audit logs first (CASCADE might handle it, but just to be safe)
        await prisma.infrastructureAuditLog.deleteMany({
            where: {
                equipment: { rackId: { in: rackIds } }
            }
        });

        // Prisma Rack deletion will cascade down to RackEquipment and EquipmentPort
        await prisma.rack.deleteMany({
            where: {
                id: { in: rackIds }
            }
        });
        console.log('Deletion successful.');
    } else {
        console.log('No recent racks found.');
    }

    // Delete "ION Network" customer created by mistake
    const ionCustomer = await prisma.customer.findFirst({
        where: { name: 'ION NETWORK' }
    });
    if (ionCustomer) {
        await prisma.customer.delete({ where: { id: ionCustomer.id } });
        console.log('Deleted ION Network customer.');
    }

}

run().catch(console.error).finally(() => prisma.$disconnect());
