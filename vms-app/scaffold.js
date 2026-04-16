const fs = require('fs');
const dir = 'app/api';

const templates = {
  tickets: 'supportTicket',
  vendorMaintenance: 'vendorMaintenance',
  goods: 'goodsItem',
  auditLogs: 'apiLog'
};

for (const [folder, model] of Object.entries(templates)) {
  fs.mkdirSync(dir + '/' + folder, { recursive: true });
  fs.writeFileSync(dir + '/' + folder + '/route.js', `import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const data = await prisma.${model}.findMany({ orderBy: { id: 'desc' } });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await prisma.${model}.create({ data: body });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
`);
}
