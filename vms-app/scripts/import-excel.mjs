import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function runImport() {
    console.log('🚀 Starting Data Migration for Cyber 1...');

    const workbook = xlsx.readFile(path.join(process.cwd(), 'DataPerangkatDanRack.xlsx'));

    // 1. Setup Datacenter Hierarchy
    let dc = await prisma.datacenter.findFirst({ where: { name: 'Gedung Cyber 1 Jakarta' } });
    if (!dc) {
        let region = await prisma.region.findFirst();
        if(!region) region = await prisma.region.create({ data: { name: 'Jakarta (JKT)', code: 'JKT-01' } });
        dc = await prisma.datacenter.create({
            data: { name: 'Gedung Cyber 1 Jakarta', regionId: region.id, code: 'CYBER-1' }
        });
    }

    const rooms = {
        'RACK CUSTOMER LT. 8 (P1)': await getOrCreateRoom(dc.id, 'ProDC P1 (Lt.8)'),
        'RACK CUSTOMER LT.9 (P2) DataHal': await getOrCreateRoom(dc.id, 'ProDC P2 DataHall A (Lt.9)')
    };

    // Helper functions
    async function getOrCreateRoom(datacenterId, name) {
        let room = await prisma.dataRoom.findFirst({ where: { name, datacenterId } });
        if (!room) room = await prisma.dataRoom.create({ data: { name, datacenterId } });
        return room;
    }

    async function getOrCreateRow(roomId, name) {
        let row = await prisma.row.findFirst({ where: { name, roomId } });
        if (!row) row = await prisma.row.create({ data: { name, roomId } });
        return row;
    }

    async function getOrCreateCustomer(name) {
        if(!name) name = 'Internal / Unknown';
        const cleaned = name.trim().toUpperCase();
        let customer = await prisma.customer.findFirst({ where: { name: cleaned } });
        if (!customer) customer = await prisma.customer.create({ data: { name: cleaned, code: `MIGRATE-${Date.now()}-${Math.floor(Math.random() * 1000)}` } });
        return customer;
    }

    async function parseSheet(sheetName, room) {
        if(!workbook.Sheets[sheetName]) return;
        console.log(`\n📄 Parsing Sheet: ${sheetName} -> Room: ${room.name}`);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        // We will dump imported racks into a single generic row for topology purposes unless we knew row layouts
        const baseRow = await getOrCreateRow(room.id, 'Imported Row A');

        let currentCustomer = null;
        let currentRack = null;
        let currentU = 1; // Start filling rack from U1 up

        for (let i = 0; i < data.length; i++) {
            const rowArr = data[i];
            if (!rowArr || rowArr.length === 0) continue;

            const firstCell = String(rowArr[0] || '').trim();
            const secondCell = String(rowArr[1] || '').trim();

            // Detect new Rack block: e.g. "RACK 1 PT INTERNUSA DUTA MAKMUR" or "Rack 2 PT. AURORA"
            if (firstCell.toUpperCase().startsWith('RACK ') && !firstCell.toUpperCase().includes('CUSTOMER')) {
                // Extract Customer Name
                let customerRaw = firstCell.replace(/RACK\s+\d+/i, '').replace(' - ', '').trim();
                currentCustomer = await getOrCreateCustomer(customerRaw);

                // Create Rack
                const rackName = `RACK-${room.id}-${currentRack ? currentRack.id + 1 : i}`;
                
                // check if rack exists
                currentRack = await prisma.rack.create({
                    data: {
                        name: firstCell,
                        rowId: baseRow.id,
                        uCapacity: 42
                    }
                });
                console.log(`   🧱 Created Rack [${firstCell}] for Customer [${currentCustomer.name}]`);
                currentU = 1; // Reset U start
                continue;
            }

            // Detect Header
            if (firstCell.toUpperCase() === 'NO' && secondCell.toUpperCase() === 'BARANG') {
                continue; // pure header
            }

            // Detect Terminal lines
            if (firstCell.toUpperCase().includes('TOTAL') || firstCell.toUpperCase().includes('TERMINATE')) {
                continue;
            }

            // Content row mapping based on discovered headers:
            // 0: No, 1: Barang, 2: QTY, 3: Berat, 4: Dimensi, 5: SN, 6: Keterangan
            const no = parseInt(firstCell);
            if (!isNaN(no) && currentRack && currentCustomer) {
                const barang = secondCell;
                const qtyRaw = rowArr[2];
                const dimensiRaw = rowArr[4];
                const sn = String(rowArr[5] || '-');
                const keterangan = String(rowArr[6] || '');

                if(!barang) continue;

                // Guess U Space from "Dimensi" or default to 1
                let uSpace = 1;
                if(dimensiRaw && !isNaN(parseInt(dimensiRaw))) {
                    uSpace = parseInt(dimensiRaw);
                } else if (String(dimensiRaw).toLowerCase().includes('u')) {
                    uSpace = parseInt(String(dimensiRaw).toLowerCase().replace('u', '')) || 1;
                }

                // If Keterangan points out it's OUT, maybe skip or map metadata
                const isOut = keterangan.toLowerCase().includes('out');

                if(!isOut) {
                    await prisma.rackEquipment.create({
                        data: {
                            rackId: currentRack.id,
                            customerId: currentCustomer.id,
                            name: sn !== '-' ? `${barang} (SN: ${sn})` : barang,
                            equipmentType: barang.toLowerCase().includes('otb') ? 'OTB' : 
                                           barang.toLowerCase().includes('pdu') ? 'PDU' : 
                                           barang.toLowerCase().includes('switch') ? 'SWITCH' : 
                                           barang.toLowerCase().includes('router') ? 'ROUTER' : 'SERVER',
                            uStart: currentU,
                            uEnd: currentU + uSpace - 1
                        }
                    });
                    
                    currentU += uSpace;
                } else {
                    console.log(`   ⏩ Skipped Equipment [${barang}] because it is marked OUT`);
                }
            }
        }
    }

    try {
        await parseSheet('RACK CUSTOMER LT. 8 (P1)', rooms['RACK CUSTOMER LT. 8 (P1)']);
        await parseSheet('RACK CUSTOMER LT.9 (P2) DataHal', rooms['RACK CUSTOMER LT.9 (P2) DataHal']);
        console.log('✅ Excel Importer Completed Successfully!');
    } catch(err) {
        console.error('❌ Migration Error:', err);
    }
}

runImport().finally(async () => {
    await prisma.$disconnect();
});
