const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const emails = ['noc@ion.net', 'tenant@techflow.local', 'jagonet@hsp.net.id', 'test@hsp.net.id', 'admin@vms.local'];
    
    for (const email of emails) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });
            console.log(`Password reset successfully for: ${email}`);
        } else {
            console.log(`User not found: ${email}`);
        }
    }
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
