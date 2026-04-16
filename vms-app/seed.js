const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Database...');

    // Clean up existing to prevent duplicates during testing (optional but good for a fresh start)
    // NOTE: In a real system you wouldn't wipe. Below is for seeding empty DBs.
    
    // Seed Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: { name: 'Super Admin' }
    });

    // Seed User
    const hashedPw = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@vms.local' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@vms.local',
            password: hashedPw,
            roleId: adminRole.id
        }
    });

    // Seed Region
    const region = await prisma.region.upsert({
        where: { name: 'Asia Pacific (AP)' },
        update: {},
        create: { name: 'Asia Pacific (AP)', code: 'APAC' }
    });

    // Seed Datacenter
    const dc1 = await prisma.datacenter.upsert({
        where: { code: 'JKT-01' },
        update: {},
        create: {
            name: 'Jakarta Core DC',
            code: 'JKT-01',
            regionId: region.id
        }
    });

    // Seed Rooms
    const roomA = await prisma.dataRoom.create({
        data: {
            name: 'Hall A',
            datacenterId: dc1.id
        }
    });

    // Seed Rows
    const row1 = await prisma.row.create({
        data: {
            name: 'A-01',
            roomId: roomA.id
        }
    });

    // Seed Racks
    const rack1 = await prisma.rack.create({
        data: {
            name: 'RK-A-01-01',
            uCapacity: 42,
            rowId: row1.id
        }
    });

    const rack2 = await prisma.rack.create({
        data: {
            name: 'RK-A-01-02',
            uCapacity: 42,
            rowId: row1.id
        }
    });

    // Seed Customer (Tenant)
    const cust1 = await prisma.customer.create({
        data: {
            name: 'TechFlow Financial',
            contactEmail: 'it@techflow.local',
            contactPhone: '+628123456789'
        }
    });

    // Seed Equipment in Rack 1 (Patch Panel at top)
    const patchPanel = await prisma.rackEquipment.create({
        data: {
            name: 'Fiber Patch Panel OTB 24',
            uStart: 42,
            uEnd: 42,
            equipmentType: 'PATCH_PANEL',
            rackId: rack1.id,
            customerId: cust1.id
        }
    });

    // Create Ports for Patch Panel
    const ppPorts = [];
    for(let i=1; i<=24; i++) {
        ppPorts.push({
            portName: i.toString(),
            equipmentId: patchPanel.id
        });
    }
    await prisma.equipmentPort.createMany({ data: ppPorts });

    // Seed Server in Rack 1
    const server1 = await prisma.rackEquipment.create({
        data: {
            name: 'Database Node 1',
            uStart: 10,
            uEnd: 11,
            equipmentType: 'SERVER',
            rackId: rack1.id,
            customerId: cust1.id
        }
    });

    // Server Ports
    await prisma.equipmentPort.createMany({
        data: [
            { portName: 'eth0', equipmentId: server1.id },
            { portName: 'eth1', equipmentId: server1.id },
            { portName: 'sfp1', equipmentId: server1.id },
            { portName: 'sfp2', equipmentId: server1.id }
        ]
    });

    // Seed Network Switch in Rack 2
    const switch1 = await prisma.rackEquipment.create({
        data: {
            name: 'Core Switch 01',
            uStart: 40,
            uEnd: 41,
            equipmentType: 'NETWORK',
            rackId: rack2.id,
            customerId: cust1.id
        }
    });

    // Switch Ports
    const swPorts = [];
    for(let i=1; i<=48; i++) {
        swPorts.push({
            portName: i.toString(),
            equipmentId: switch1.id
        });
    }
    await prisma.equipmentPort.createMany({ data: swPorts });

    // Try Cross Connect
    const fetchedSFP2 = await prisma.equipmentPort.findFirst({ where: { portName: 'sfp2', equipmentId: server1.id } });
    const fetchedSwPort1 = await prisma.equipmentPort.findFirst({ where: { portName: '1', equipmentId: switch1.id } });

    if (fetchedSFP2 && fetchedSwPort1) {
        await prisma.crossConnect.create({
            data: {
                sideAPortId: fetchedSFP2.id,
                sideZPortId: fetchedSwPort1.id,
                mediaType: 'Fiber-SM-LC',
                status: 'ACTIVE',
                customerId: cust1.id,
                datacenterId: dc1.id
            }
        });
    }

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
