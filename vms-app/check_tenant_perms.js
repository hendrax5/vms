const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.role.findMany({
        where: { name: { in: ['Tenant Admin', 'Tenant Staff'] } },
        include: { permissions: { include: { permission: true } } }
    });
    console.log(JSON.stringify(roles, null, 2));
    await prisma.$disconnect();
}
main().catch(console.error);
