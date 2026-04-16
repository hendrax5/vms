const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addTenantUser() {
  try {
    const role = await prisma.role.upsert({
      where: { name: 'Customer' },
      update: {},
      create: { name: 'Customer' }
    });

    const customer = await prisma.customer.findFirst({
      where: { name: 'TechFlow Financial' }
    });

    if (!customer) {
        console.log("Customer not found!");
        return;
    }

    const hashedPw = await bcrypt.hash('tenant123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'tenant@vms.local' },
      update: { customerId: customer.id, roleId: role.id },
      create: {
        name: 'TechFlow Admin',
        email: 'tenant@vms.local',
        password: hashedPw,
        roleId: role.id,
        customerId: customer.id
      }
    });

    console.log('Customer User Created Successfully:');
    console.log(`Email: ${user.email}`);
    console.log(`Password: tenant123`);
    console.log(`Assigned Customer ID: ${user.customerId}`);

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

addTenantUser();
