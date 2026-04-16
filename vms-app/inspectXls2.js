const xlsx = require('xlsx');

const workbook = xlsx.readFile('DataPerangkatDanRack.xlsx');

const sheetsToInspect = ['RACK CUSTOMER LT. 8 (P1)', 'RACK CUSTOMER LT.9 (P2) DataHal'];

sheetsToInspect.forEach(sheetName => {
    console.log(`\n\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // show first 30 rows
    for(let i=0; i<min(30, data.length); i++) {
        if(data[i] && data[i].length > 0 && data[i].some(c => c !== undefined && c !== null && c !== '')) {
            console.log(`R${i}:`, data[i]);
        }
    }
});

function min(a,b) { return a < b ? a : b; }
