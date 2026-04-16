import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function configureSeed() {
    console.log('🌱 Starting VMS Database Identity Seeder...');
    
    try {
        // ---------------------------------------------------------
        // 1. Roles & Permissions seeding
        // ---------------------------------------------------------
        console.log('🔑 Provisioning standard roles...');
        const superAdminRole = await prisma.role.upsert({
            where: { name: 'SuperAdmin' },
            update: {},
            create: { name: 'SuperAdmin' }
        });

        const nocRole = await prisma.role.upsert({
            where: { name: 'NOC' },
            update: {},
            create: { name: 'NOC' }
        });

        const customerRole = await prisma.role.upsert({
            where: { name: 'Customer' },
            update: {},
            create: { name: 'Customer' }
        });

        // ---------------------------------------------------------
        // 2. Default Initial Users setup
        // ---------------------------------------------------------
        console.log('👤 Provisioning default access accounts...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        // A. Super Admin
        await prisma.user.upsert({
            where: { email: 'admin@vms.local' },
            update: {},
            create: {
                email: 'admin@vms.local',
                name: 'System Root',
                password: hashedPassword,
                roleId: superAdminRole.id
            }
        });

        // B. NOC Level User
        // Note: Needs a valid dcSiteId ideally, assuming 1 for test from previous flow.
        const site = await prisma.dCSite.findFirst();
        await prisma.user.upsert({
            where: { email: 'noc@vms.local' },
            update: {},
            create: {
                email: 'noc@vms.local',
                name: 'NOC Operator',
                password: hashedPassword,
                roleId: nocRole.id,
                dcSiteId: site ? site.id : undefined
            }
        });

        // C. Customer Client User
        await prisma.user.upsert({
            where: { email: 'customer@vms.local' },
            update: {},
            create: {
                email: 'customer@vms.local',
                name: 'Telkom Portal Admin',
                password: hashedPassword,
                roleId: customerRole.id
            }
        });

        console.log('✅ Seeding completed! You can now log in using standard credentials:');
        console.log(' -> admin@vms.local : password123');
        console.log(' -> noc@vms.local : password123');
    } catch (error) {
        console.error('❌ Root error during seeding:', error);
    } finally {
        await prisma.$disconnect();
    }
}

configureSeed();
