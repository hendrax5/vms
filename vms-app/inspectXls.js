const xlsx = require('xlsx');

const workbook = xlsx.readFile('DataPerangkatDanRack.xlsx');
console.log('Available Sheets:', workbook.SheetNames);

const sheetsToInspect = ['RACK CUSTOMER LT. 8 (P1)', 'RACK CUSTOMER LT.9 (P2) DataHal']; // Notice they said DataHall A, maybe name is truncated

workbook.SheetNames.forEach(sheetName => {
    if (sheetName.includes('RACK CUSTOMER LT. 8 (P1)') || sheetName.includes('LT.9 (P2) DataHall A')) {
        console.log(`\n\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log('Headers / Row 1:', data[0]);
        console.log('Headers / Row 2:', data[1]);
        console.log('Headers / Row 3:', data[2]);
        console.log('Row 4 Sample:', data[3]);
        console.log('Row 5 Sample:', data[4]);
    }
});
