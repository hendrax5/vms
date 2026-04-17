const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Permissions data...');

    const permissions = [
        { key: 'users:manage', label: 'Manage Users', group: 'Administration' },
        { key: 'roles:manage', label: 'Manage Roles', group: 'Administration' },
        { key: 'infrastructure:read', label: 'View Infrastructure Topology', group: 'Infrastructure' },
        { key: 'infrastructure:write', label: 'Manage Racks & Rows', group: 'Infrastructure' },
        { key: 'tickets:read', label: 'View Support Tickets', group: 'Support' },
        { key: 'tickets:write', label: 'Create/Reply Tickets', group: 'Support' },
        { key: 'tickets:manage', label: 'Assign & Resolve Tickets (Admin)', group: 'Support' },
        { key: 'permits:read', label: 'View Visit Permits', group: 'Access Control' },
        { key: 'permits:approve', label: 'Approve Visit Permits', group: 'Access Control' },
        { key: 'customers:read', label: 'View Customers', group: 'CRM' },
        { key: 'customers:write', label: 'Manage Customers', group: 'CRM' },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { key: perm.key },
            update: { label: perm.label, group: perm.group },
            create: perm,
        });
    }

    console.log('Permissions seeded successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
