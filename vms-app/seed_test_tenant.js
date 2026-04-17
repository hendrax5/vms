const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const role = await prisma.role.findUnique({ where: { name: 'Tenant Admin' } });
    if (!role) {
        console.error('Tenant Admin role not found. Run seed_permissions.js first.');
        return;
    }

    const customer = await prisma.customer.findFirst();
    if (!customer) {
        console.error('No customer found. Run seed.js first.');
        return;
    }

    const hashedPw = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'tenant@techflow.local' },
        update: {},
        create: {
            name: 'TechFlow Admin',
            email: 'tenant@techflow.local',
            password: hashedPw,
            roleId: role.id,
            customerId: customer.id
        }
    });

    console.log('Created Tenant User:', user.email);
}

main().finally(() => prisma.$disconnect());
