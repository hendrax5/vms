import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In Next.js 16+, params should be awaited if we are accessing their properties
export async function PUT(req, { params }) {
    try {
        const routeParams = await params;
        const id = parseInt(routeParams.id);
        const body = await req.json();

        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const { name, code, contactEmail, contactPhone } = body;

        const customer = await prisma.customer.update({
            where: { id },
            data: { name, code, contactEmail, contactPhone }
        });

        return NextResponse.json(customer);
    } catch (error) {
        console.error("Failed to update customer:", error);
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const routeParams = await params;
        const id = parseInt(routeParams.id);
        
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // Check if customer has equipments or cross connects to prevent hard delete errors
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { rackEquipments: true, crossConnects: true }
                }
            }
        });

        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        if (customer._count.rackEquipments > 0 || customer._count.crossConnects > 0) {
            return NextResponse.json({ 
                error: `Cannot delete customer. They still own ${customer._count.rackEquipments} racks and ${customer._count.crossConnects} cross-connects.` 
            }, { status: 400 });
        }

        await prisma.customer.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete customer:", error);
        return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
    }
}
