import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function DELETE(req, props) {
    try {
        const params = await props.params;
        await prisma.dataRoom.delete({
            where: { id: parseInt(params.id) }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req, props) {
    try {
        const params = await props.params;
        const body = await req.json();
        const updated = await prisma.dataRoom.update({
            where: { id: parseInt(params.id) },
            data: body
        });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
