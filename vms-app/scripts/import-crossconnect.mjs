import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function runImport() {
    console.log('🚀 Starting Data Migration for Cross Connects...');

    const filePath = path.join(process.cwd(), 'datainterkoneksi.xlsx');
    console.log('Reading file:', filePath);
    const workbook = xlsx.readFile(filePath);
    
    const sheetName = 'Data Interkoneksi';
    if (!workbook.Sheets[sheetName]) {
        console.error(`Sheet '${sheetName}' not found!`);
        return;
    }
    
    // Fallback room if we need to create a rack that doesn't exist yet
    let fallbackDc = await prisma.datacenter.findFirst({ where: { name: 'Gedung Cyber 1 Jakarta' } });
    if (!fallbackDc) {
         let region = await prisma.region.findFirst();
         fallbackDc = await prisma.datacenter.create({
             data: { name: 'Gedung Cyber 1 Jakarta', regionId: region?.id || 1, code: 'CYBER-1' }
         });
    }
    let fallbackRoom = await prisma.dataRoom.findFirst({ where: { name: 'Imported Room', datacenterId: fallbackDc.id } });
    if (!fallbackRoom) {
         fallbackRoom = await prisma.dataRoom.create({ data: { name: 'Imported Room', datacenterId: fallbackDc.id } });
    }
    let fallbackRow = await prisma.row.findFirst({ where: { roomId: fallbackRoom.id } });
    if (!fallbackRow) {
         fallbackRow = await prisma.row.create({ data: { name: 'Imported Row', roomId: fallbackRoom.id } });
    }

    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    // Data starts at index 4 (row 5)
    
    let createdCount = 0;
    
    for (let i = 4; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 13) continue;

        const customerName = String(row[2] || '').trim();
        if (!customerName) continue; // Skip invalid row

        // Indices
        // Mapping based on "Data Interkoneksi" sheet headers
        const ewoCode = String(row[1] || '').trim();
        const apjiiCode = String(row[3] || '').trim();
        const labelNumber = String(row[4] || '').trim();
        const mediaType = String(row[5] || 'Fiberoptic').trim();
        
        const srcRackName = String(row[6] || '').trim();
        const srcEquipName = String(row[7] || '').trim();
        const srcPortName = String(row[8] || '1').trim();

        const dstRackName = String(row[9] || '').trim();
        const dstEquipName = String(row[10] || '').trim();
        const dstPortName = String(row[11] || '1').trim();
        
        const statusRaw = String(row[12] || '').trim();
        const notes = String(row[13] || '').trim();

        if (!srcRackName && !dstRackName) continue;

        console.log(`Processing Import Row ${i}: Provider/Customer [${customerName}]`);

        // 1. Get or Create Customer
        let customer = await prisma.customer.findFirst({ where: { name: customerName.toUpperCase() } });
        if (!customer) {
            customer = await prisma.customer.create({ data: { name: customerName.toUpperCase(), code: `MIGRATE-${Date.now()}` } });
        }

        // Helper to resolve ports
        async function resolvePort(rackName, equipName, portName) {
            if (!rackName) return null;
            
            // Allow exact match or partial match for Racks since "Close Rack 39" might just be "Rack 39"
            let rack = await prisma.rack.findFirst({ where: { name: rackName } });
            if (!rack) {
                 rack = await prisma.rack.create({
                     data: { name: rackName, rowId: fallbackRow.id, uCapacity: 42 }
                 });
            }

            let equip = await prisma.rackEquipment.findFirst({ where: { name: equipName, rackId: rack.id } });
            if (!equip) {
                // Determine equipment type based on name loosely
                let type = 'PATCH_PANEL';
                if(equipName.toUpperCase().includes('OTB')) type = 'OTB';
                if(equipName.toUpperCase().includes('SWITCH')) type = 'SWITCH';
                if(equipName.toUpperCase().includes('ROUTER') || equipName.toUpperCase().includes('CCR')) type = 'ROUTER';

                equip = await prisma.rackEquipment.create({
                     data: {
                         name: equipName,
                         equipmentType: type,
                         rackId: rack.id,
                         customerId: customer.id,
                         uStart: 1, uEnd: 1
                     }
                });
            }

            let port = await prisma.equipmentPort.findFirst({ where: { equipmentId: equip.id, portName: String(portName) } });
            if (!port) {
                port = await prisma.equipmentPort.create({
                     data: { equipmentId: equip.id, portName: String(portName) }
                });
            }
            return port;
        }

        const portA = await resolvePort(srcRackName, srcEquipName, srcPortName);
        const portZ = await resolvePort(dstRackName, dstEquipName, dstPortName);

        if (portA && portZ) {
            // Check if already exists
            const existingXConn = await prisma.crossConnect.findFirst({
                where: { sideAPortId: portA.id, sideZPortId: portZ.id }
            });
            
            if (!existingXConn) {
                await prisma.crossConnect.create({
                    data: {
                        datacenterId: fallbackDc.id,
                        customerId: customer.id,
                        mediaType: mediaType,
                        sideAPortId: portA.id,
                        sideZPortId: portZ.id,
                        status: statusRaw || 'Active',
                        ewoCode: ewoCode || null,
                        apjiiCode: apjiiCode || null,
                        labelNumber: labelNumber || null,
                        notes: notes || null,
                        targetProvider: notes // backward compatibility
                    }
                });
                createdCount++;
            }
        }
    }

    console.log(`\n✅ Cross Connect Migration Completed. Imported ${createdCount} connections.`);
}

runImport()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
