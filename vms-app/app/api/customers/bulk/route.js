import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { prisma } from '../../../../../lib/prisma';

export async function POST(req) {
    try {
        const body = await req.json();
        const session = await getServerSession(authOptions);
        
        const userRole = (session?.user?.role || '').toLowerCase().replace(/\s+/g, '');
        const isSuperAdmin = userRole === 'superadmin';
        
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Unauthorized. Only SuperAdmin can bulk import customers.' }, { status: 403 });
        }

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Payload must be an array' }, { status: 400 });
        }

        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        for (let i = 0; i < body.length; i++) {
            const item = body[i];
            try {
                if (item.id) {
                    await prisma.customer.update({
                        where: { id: parseInt(item.id) },
                        data: {
                            name: item.name,
                            code: item.code || null,
                            contactEmail: item.contactEmail || null,
                            contactPhone: item.contactPhone || null
                        }
                    });
                } else {
                    await prisma.customer.create({
                        data: {
                            name: item.name,
                            code: item.code || null,
                            contactEmail: item.contactEmail || null,
                            contactPhone: item.contactPhone || null
                        }
                    });
                }
                results.successCount++;
            } catch (err) {
                results.failedCount++;
                results.errors.push({ index: i, name: item.name, message: err.message });
            }
        }

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
