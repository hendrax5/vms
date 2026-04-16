import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runWorkflow() {
    console.log('🚀 [VMS Workflow Test] Starting End-to-End Integration Test...\n');

    try {
        // ---------------------------------------------------------
        // 1. Fetch Master Data
        // ---------------------------------------------------------
        console.log('⏳ Fetching Site and Customer data...');
        const site = await prisma.dCSite.findFirst();
        const customer = await prisma.customer.findFirst();

        if (!site || !customer) {
            console.error('❌ Error: No Site or Customer found. Please run the seed script first.');
            process.exit(1);
        }
        console.log(`✅ Found Site: ${site.name} | Customer: ${customer.name}\n`);

        // ---------------------------------------------------------
        // 2. Simulate Mail-Worker (Incoming Permit)
        // ---------------------------------------------------------
        console.log('📧 [Mail-Worker Simulation] Simulating incoming Permit Request from Email...');
        const permit = await prisma.visitPermit.create({
            data: {
                siteId: site.id,
                customerId: customer.id,
                companyName: 'PT Workflow Integration',
                visitorNames: 'Alex Worker, Sam Tester',
                scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
                activity: 'Install new Switch and Cross-Connects',
                status: 'Pending'
            }
        });
        console.log(`✅ Permit Created: PRM-[${permit.id}] - Status Object: ${permit.status}\n`);

        // ---------------------------------------------------------
        // 3. NOC Dashboard Action (Approve Permit)
        // ---------------------------------------------------------
        console.log('👨‍💻 [NOC Action] Simulating NOC Dashboard Approval via PUT API...');
        const approvedPermit = await prisma.visitPermit.update({
            where: { id: permit.id },
            data: { status: 'Approved' }
        });
        console.log(`✅ Permit Status updated to: ${approvedPermit.status}\n`);

        // ---------------------------------------------------------
        // 4. Logistics Engine (Add Rack Equipment with Validation)
        // ---------------------------------------------------------
        console.log('📦 [Logistics Engine] Allocating U-Space in Rack...');
        let rack = await prisma.rack.findFirst({
            where: { siteId: site.id, name: 'A-01' }
        });

        if (!rack) {
             rack = await prisma.rack.create({
                 data: { siteId: site.id, name: 'A-01', capacity: 42, powerCapacity: 10.0 }
             });
        }

        const equipment = await prisma.rackEquipment.create({
             data: {
                 rackId: rack.id,
                 customerId: customer.id,
                 name: 'Cisco Nexus 9k',
                 uStart: 10,
                 uEnd: 11, // Takes 2U
                 status: 'Active'
             }
        });
        console.log(`✅ Equipment Installed: ${equipment.name} taking U${equipment.uStart}-U${equipment.uEnd}\n`);

        // ---------------------------------------------------------
        // 5. Cross-Connect Engine (Collision Detection)
        // ---------------------------------------------------------
        console.log('🔌 [Cross-Connect Engine] Provisioning new Fiber connect...');
        const cx = await prisma.crossConnect.create({
            data: {
                site: { connect: { id: site.id } },
                customer: { connect: { id: customer.id } },
                sideARack: { connect: { id: rack.id } },
                sideZRack: { connect: { id: rack.id } }, // Loopback test
                mediaType: 'Singlemode Fiber OM4',
                sideAPort: 'A-01 / P15',
                sideZPort: 'B-02 / P01',
                status: 'Active'
            }
        });
        console.log(`✅ CrossConnect Provisioned: CX-[${cx.id}] (${cx.sideAPort} -> ${cx.sideZPort})\n`);

        console.log('🎉 [Result] End-to-End Workflow Test Completed Successfully!');

    } catch (error) {
        console.error('❌ [Workflow Error] An exception occurred during the test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runWorkflow();
