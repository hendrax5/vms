import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const customerId = parseInt(resolvedParams.id);

        if (isNaN(customerId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Authorization Check
        const userRole = ((session.user as any)?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const sessionCustomerId = (session.user as any).customerId;

        if (!isInternalAdmin && sessionCustomerId !== customerId) {
            return NextResponse.json({ error: 'Forbidden. You do not have access to this tenant.' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            where: { customerId: customerId },
            select: {
                id: true,
                name: true,
                email: true,
                role: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(users);
    } catch (error: any) {
        console.error("Failed to fetch tenant users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
