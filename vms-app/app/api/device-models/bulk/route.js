import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const body = await req.json();
        const session = await getServerSession(authOptions);
        
        const userRole = (session?.user?.role || '').toLowerCase().replace(/\s+/g, '');
        const isSuperAdmin = userRole === 'superadmin';
        
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Unauthorized. Only SuperAdmin can import device catalogs.' }, { status: 403 });
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
                    await prisma.deviceModel.update({
                        where: { id: parseInt(item.id) },
                        data: Object.fromEntries(
                            Object.entries({
                                brand: item.brand,
                                modelName: item.modelName,
                                equipmentType: item.equipmentType,
                                uSize: item.uSize !== undefined ? parseInt(item.uSize) : undefined,
                                portCount: item.portCount !== undefined ? parseInt(item.portCount) : undefined,
                                requiresSerialNumber: item.requiresSerialNumber,
                                powerDrawW: item.powerDrawW ? parseInt(item.powerDrawW) : null
                            }).filter(([_, v]) => v !== undefined)
                        )
                    });
                } else {
                    await prisma.deviceModel.create({
                        data: {
                            brand: item.brand,
                            modelName: item.modelName,
                            equipmentType: item.equipmentType || 'SERVER',
                            uSize: parseInt(item.uSize) || 1,
                            portCount: parseInt(item.portCount) || 24,
                            requiresSerialNumber: item.requiresSerialNumber ?? true,
                            powerDrawW: item.powerDrawW ? parseInt(item.powerDrawW) : null
                        }
                    });
                }
                results.successCount++;
            } catch (err) {
                results.failedCount++;
                results.errors.push({ index: i, name: item.modelName, message: err.message });
            }
        }

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
