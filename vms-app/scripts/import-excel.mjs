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
        'RACK CUSTOMER LT.9 (P2) DataHal': await getOrCreateRoom(dc.id, 'ProDC P2 DataHall A (Lt.9)'),
        'RACK HSP': await getOrCreateRoom(dc.id, 'HSP Point of Presence'),
        'MMR OPEN RACK LT. 8 (P1)': await getOrCreateRoom(dc.id, 'MMR P1 (Lt.8)'),
        'MMR OPEN RACK LT.9 (P2)': await getOrCreateRoom(dc.id, 'MMR P2 (Lt.9)'),
        'RACK MMR OTB': await getOrCreateRoom(dc.id, 'MMR OTB Room')
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

    async function parseSheet(sheetName, room, forceCustomerName = null) {
        if(!workbook.Sheets[sheetName]) {
            console.log(`⚠️ Sheet '${sheetName}' not found in the workbook, skipping.`);
            return;
        }
        console.log(`\n📄 Parsing Sheet: ${sheetName} -> Room: ${room.name}`);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        const baseRow = await getOrCreateRow(room.id, 'Imported Row A');

        let currentCustomer = forceCustomerName ? await getOrCreateCustomer(forceCustomerName) : null;
        let currentRack = null;
        let currentU = 1;

        // Ensure we have a default rack fallback in case a raw equipment list appears without a "RACK X" header
        const getFallbackRack = async () => {
            if(!currentRack) {
                 if(!currentCustomer) currentCustomer = await getOrCreateCustomer('Internal / Unknown');
                 const fallbackName = `${sheetName} Main Rack`;
                 currentRack = await prisma.rack.findFirst({ where: { name: fallbackName, rowId: baseRow.id } });
                 
                 if (!currentRack) {
                     currentRack = await prisma.rack.create({
                         data: {
                             name: fallbackName,
                             rowId: baseRow.id,
                             uCapacity: 42
                         }
                     });
                     console.log(`   🧱 Created Contextual Default Rack [${fallbackName}]`);
                 } else {
                     console.log(`   ♻️ Using Existing Contextual Rack [${fallbackName}]`);
                 }
            }
            return currentRack;
        };

        for (let i = 0; i < data.length; i++) {
            const rowArr = data[i];
            if (!rowArr || rowArr.length === 0) continue;

            const firstCell = String(rowArr[0] || '').trim();
            const secondCell = String(rowArr[1] || '').trim();

            if (firstCell.toUpperCase().startsWith('RACK ') && !firstCell.toUpperCase().includes('CUSTOMER') && !firstCell.toUpperCase().includes('HSP')) {
                let customerRaw = forceCustomerName || firstCell.replace(/RACK\s+\d+/i, '').replace(' - ', '').trim();
                currentCustomer = await getOrCreateCustomer(customerRaw);

                currentRack = await prisma.rack.create({
                    data: {
                        name: firstCell,
                        rowId: baseRow.id,
                        uCapacity: 42
                    }
                });
                console.log(`   🧱 Created Rack [${firstCell}] for Customer [${currentCustomer.name}]`);
                currentU = 1;
                continue;
            }

            if (firstCell.toUpperCase() === 'NO' && secondCell.toUpperCase() === 'BARANG') {
                continue;
            }

            if (firstCell.toUpperCase().includes('TOTAL') || firstCell.toUpperCase().includes('TERMINATE')) {
                continue;
            }

            // Different sheet formats:
            const no = parseInt(firstCell);
            const isOtbSheet = sheetName === 'RACK MMR OTB';
            const isValidRow = !isNaN(no) || (isOtbSheet && secondCell && secondCell.toUpperCase() !== 'BARANG' && firstCell.toUpperCase() !== 'NO RACK');

            if (isValidRow) {
                await getFallbackRack();

                const barang = secondCell;
                const qtyRaw = isOtbSheet ? rowArr[4] : rowArr[2];
                const tujuanRaw = isOtbSheet ? String(rowArr[3] || '').trim() : '';
                const beratRaw = isOtbSheet ? rowArr[5] : rowArr[3];
                const dimensiRaw = isOtbSheet ? rowArr[6] : rowArr[4];
                const sn = isOtbSheet ? String(rowArr[7] || '-') : String(rowArr[5] || '-');
                const keterangan = isOtbSheet ? String(rowArr[8] || '') : String(rowArr[6] || '');
                const tglMasukRaw = isOtbSheet ? rowArr[10] : rowArr[7];

                if(!barang) continue;

                let uSpace = 1;
                // Workaround for Excel Auto-increment bug when users dragged "u1" -> "u2", "u3" etc
                if (barang.toUpperCase().includes('24C') || barang.toUpperCase().includes('24 C')) uSpace = 1;
                else if (barang.toUpperCase().includes('96C') || barang.toUpperCase().includes('96 C')) uSpace = 2;
                else if (barang.toUpperCase().includes('192C') || barang.toUpperCase().includes('192 C')) uSpace = 3;
                else if (barang.toUpperCase().includes('288C') || barang.toUpperCase().includes('288 C')) uSpace = 4;
                else if(dimensiRaw && !isNaN(parseInt(dimensiRaw))) {
                    uSpace = parseInt(dimensiRaw);
                } else if (String(dimensiRaw).toLowerCase().includes('u')) {
                    uSpace = parseInt(String(dimensiRaw).toLowerCase().replace('u', '')) || 1;
                }

                const isOut = keterangan.toLowerCase().includes('out');

                if(!isOut) {
                    let finalName = barang;
                    if (tujuanRaw && tujuanRaw !== '-' && tujuanRaw.toLowerCase() !== 'tujuan rack') {
                        finalName += ` [Ke: ${tujuanRaw}]`;
                    }
                    if (sn !== '-') finalName += ` (SN: ${sn})`;

                    await prisma.rackEquipment.create({
                        data: {
                            rackId: currentRack.id,
                            customerId: currentCustomer.id,
                            name: finalName,
                            equipmentType: barang.toLowerCase().includes('otb') ? 'OTB' : 
                                           barang.toLowerCase().includes('pdu') ? 'PDU' : 
                                           barang.toLowerCase().includes('switch') ? 'SWITCH' : 
                                           barang.toLowerCase().includes('router') ? 'ROUTER' : 'SERVER',
                            uStart: currentU,
                            uEnd: currentU + uSpace - 1,
                            serialNumber: sn !== '-' ? sn : null,
                            weight: beratRaw ? String(beratRaw) : null,
                            arrivalDate: tglMasukRaw ? new Date(tglMasukRaw) : null
                        }
                    });
                    console.log(`   🗄️ Imported Equipment [${barang}] into ${currentRack.name} U${currentU}`);
                    currentU += uSpace;
                } else {
                    console.log(`   ⏩ Skipped Equipment [${barang}] because it is marked OUT`);
                }
            }
        }
    }

    try {
        // await parseSheet('RACK CUSTOMER LT. 8 (P1)', rooms['RACK CUSTOMER LT. 8 (P1)']);
        // await parseSheet('RACK CUSTOMER LT.9 (P2) DataHal', rooms['RACK CUSTOMER LT.9 (P2) DataHal']);
        // await parseSheet('RACK HSP', rooms['RACK HSP'], 'ION Network');
        await parseSheet('MMR OPEN RACK LT. 8 (P1)', rooms['MMR OPEN RACK LT. 8 (P1)'], 'Provider MMR Layer 8');
        // await parseSheet('MMR OPEN RACK LT.9 (P2)', rooms['MMR OPEN RACK LT.9 (P2)'], 'Provider MMR Layer 9');
        // await parseSheet('RACK MMR OTB', rooms['RACK MMR OTB'], 'Provider OTB Layer');

        console.log('✅ Excel Importer Completed Successfully!');
    } catch(err) {
        console.error('❌ Migration Error:', err);
    }
}

runImport().finally(async () => {
    await prisma.$disconnect();
});
