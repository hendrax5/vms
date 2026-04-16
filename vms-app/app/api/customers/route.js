import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { rackEquipments: true, crossConnects: true }
                }
            }
        });
        return NextResponse.json(customers);
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, code, contactEmail, contactPhone } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                code,
                contactEmail,
                contactPhone
            }
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        console.error("Failed to create customer:", error);
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}
