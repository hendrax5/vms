const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding VMS Standalone Testing Data...');
  
  // 1. Roles
  const superadminRole = await prisma.role.upsert({
    where: { name: 'SuperAdmin' },
    update: {},
    create: { name: 'SuperAdmin' },
  });
  const nocRole = await prisma.role.upsert({
    where: { name: 'NOC Operator' },
    update: {},
    create: { name: 'NOC Operator' },
  });
  
  // 2. DC Sites
  const siteJkt = await prisma.dCSite.upsert({
    where: { code: 'JKT-1' },
    update: {},
    create: { code: 'JKT-1', name: 'Jakarta East Data Center', nocEmail: 'noc-jkt@antigravity.net' }
  });

  const siteSgp = await prisma.dCSite.upsert({
    where: { code: 'SGP-1' },
    update: {},
    create: { code: 'SGP-1', name: 'Singapore Keppel DC', nocEmail: 'noc-sgp@antigravity.net' }
  });

  // 3. Customers
  const customerTelkom = await prisma.customer.upsert({
      where: { name: 'PT Telkom Indonesia' },
      update: {},
      create: { name: 'PT Telkom Indonesia', code: 'TLK-01', contactEmail: 'info@telkom.co.id' }
  });

  // 4. Racks
  const rackA = await prisma.rack.create({
      data: { siteId: siteJkt.id, name: 'A-01', uCapacity: 42 }
  });

  const rackB = await prisma.rack.create({
      data: { siteId: siteJkt.id, name: 'B-01', uCapacity: 42 }
  });

  // 5. Rack Equipment
  await prisma.rackEquipment.create({
      data: { rackId: rackA.id, customerId: customerTelkom.id, name: 'Core Router Cisco ASR', uStart: 40, uEnd: 42 }
  });

  // 6. Vendor Maintenance (For SLA Engine Testing)
  await prisma.vendorMaintenance.create({
      data: {
          type: 'Power',
          startTime: new Date(new Date().setHours(new Date().getHours() - 3)),
          endTime: new Date(),
          description: 'Emergency UPS Battery Replacement',
          affectedRacks: { connect: [{ id: rackA.id }, { id: rackB.id }] }
      }
  });

  console.log('Seeding Complete! System ready for tests.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
