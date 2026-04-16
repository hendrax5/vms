const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const permissions = [
    // Dashboard & Global
    { key: 'dashboard:view', label: 'View Dashboard', group: 'Dashboard' },
    
    // Infrastructure
    { key: 'infrastructure:view', label: 'View Infrastructure Topology', group: 'Infrastructure' },
    { key: 'infrastructure:edit', label: 'Manage Infrastructure (CRUD Sites, Rooms, Racks)', group: 'Infrastructure' },
    { key: 'racks:manage', label: 'Manage Racks & Equipments', group: 'Infrastructure' },
    
    // Tickets
    { key: 'tickets:view', label: 'View All Tickets', group: 'Ticketing' },
    { key: 'tickets:create', label: 'Create Tickets', group: 'Ticketing' },
    { key: 'tickets:edit', label: 'Update/Reply to Tickets', group: 'Ticketing' },
    { key: 'tickets:delete', label: 'Delete Tickets', group: 'Ticketing' },
    
    // Permits
    { key: 'permits:view', label: 'View All Permits', group: 'Permits' },
    { key: 'permits:approve', label: 'Approve/Reject Permits', group: 'Permits' },
    
    // SLA & Reports
    { key: 'sla:view', label: 'View SLA & Metrics', group: 'Reports' },
    { key: 'reports:export', label: 'Export Reports', group: 'Reports' },
    
    // Admin Settings
    { key: 'settings:manage', label: 'Manage System Settings', group: 'System' },
    { key: 'roles:manage', label: 'Manage Roles & Permissions', group: 'System' },
    { key: 'users:manage', label: 'Manage Users', group: 'System' },
];

async function main() {
    console.log('Seeding Permissions & Roles...');

    // 1. Ensure core roles exist
    const rolesToEnsure = ['Super Admin', 'NOC', 'Manager', 'Staff'];
    const roleMap = {};
    for (const roleName of rolesToEnsure) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName }
        });
        roleMap[roleName] = role;
    }

    // 2. Ensure permissions exist
    const permMap = {};
    for (const p of permissions) {
        const perm = await prisma.permission.upsert({
            where: { key: p.key },
            update: { label: p.label, group: p.group },
            create: { key: p.key, label: p.label, group: p.group }
        });
        permMap[p.key] = perm;
    }

    // 3. Attach ALL permissions to Super Admin
    const superAdminRoleId = roleMap['Super Admin'].id;
    for (const p of Object.values(permMap)) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRoleId,
                    permissionId: p.id
                }
            },
            update: {},
            create: {
                roleId: superAdminRoleId,
                permissionId: p.id
            }
        });
    }

    // // Default NOC Permissions Setup
    const nocPermissions = [
        'dashboard:view', 'infrastructure:view', 'racks:manage',
        'tickets:view', 'tickets:edit', 'permits:view', 'permits:approve',
        'sla:view'
    ];
    for (const key of nocPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: roleMap['NOC'].id,
                    permissionId: permMap[key].id
                }
            },
            update: {},
            create: {
                roleId: roleMap['NOC'].id,
                permissionId: permMap[key].id
            }
        });
    }

    console.log('Successfully seeded RBAC configuration!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
