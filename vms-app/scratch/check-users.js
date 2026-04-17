const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: {
                select: { name: true }
            },
            customerId: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
