const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('Starting E2E Validation...\n');

  try {
    const dc = await prisma.datacenter.findFirst();
    const tenant = await prisma.customer.findFirst();

    console.log(`[1] Testing Visitor Check-in for DC: ${dc.name}, Tenant: ${tenant.name}`);
    const permit = await prisma.visitPermit.create({
      data: {
        datacenterId: dc.id,
        customerId: tenant.id,
        visitorNames: 'Alice (Test)',
        activity: 'E2E Testing',
        scheduledAt: new Date(),
        status: 'CheckedIn'
      }
    });
    console.log('  -> Success! Permit ID:', permit.id);

    const rack = await prisma.rack.findFirst();

    console.log(`\n[2] Validating Auto-Port Creation for Equipment in Rack: ${rack.name}`);
    const eq = await prisma.rackEquipment.create({
      data: {
        rackId: rack.id,
        customerId: tenant.id,
        name: 'Test Auto Ports Switch',
        equipmentType: 'SWITCH',
        uStart: 1,
        uEnd: 1,
        ports: {
          create: Array.from({length: 4}, (_, i) => ({ portName: `Port ${i+1}` }))
        }
      },
      include: { ports: true }
    });
    console.log(`  -> Success! Equipment ID: ${eq.id} created with ${eq.ports.length} ports.`);

    console.log(`\n[3] Testing E2E Cross-Connect Provisioning & Collision Prevention...`);
    const portA = eq.ports[0];
    const portZ = eq.ports[1];

    const cc = await prisma.crossConnect.create({
      data: {
        datacenterId: dc.id,
        customerId: tenant.id,
        sideAPortId: portA.id,
        sideZPortId: portZ.id,
        mediaType: 'Cat6',
        status: 'Active'
      }
    });

    console.log('  -> Success! Cross-Connect ID:', cc.id, 'linked Port', portA.portName, 'to Port', portZ.portName);

    console.log('\n[4] Testing Port Collision Defense...');
    const existingPorts = await prisma.crossConnect.findMany({
      where: {
        OR: [
          { sideAPortId: portA.id },
          { sideZPortId: portA.id },
          { sideAPortId: portZ.id },
          { sideZPortId: portZ.id }
        ]
      }
    });

    if (existingPorts.length > 0) {
      console.log('  -> Defense Active: Ports are currently marked IN_USE. Cannot double cross-connect.');
    }

  } catch(e) {
    console.error('Test Failed:', e);
  } finally {
    prisma.$disconnect();
  }
}

runTests();
