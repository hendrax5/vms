import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { EquipmentService } from '../../../../../lib/services/equipment.service';

export async function POST(req) {
    try {
        const body = await req.json();
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Payload must be an array of equipment objects' }, { status: 400 });
        }

        const equipmentService = new EquipmentService();
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        for (let i = 0; i < body.length; i++) {
            const item = body[i];
            try {
                // Determine uStart and uEnd logic
                let uEnd = item.uEnd;
                let uStart = item.uStart;
                
                if(!uEnd && uStart) {
                    // Try to guess uEnd if they specified a size or it defaults to a 1U size
                     uEnd = uStart + (parseInt(item.uSize) || 1) - 1;
                }

                // Append guessed defaults dynamically so EquipmentService takes it natively
                item.uEnd = uEnd;
                item.portCount = parseInt(item.portCount) || 24;

                if (item.id) {
                    await equipmentService.updateEquipmentDetails(item.id, item, session.user);
                    if (item.status && item.status !== 'Active') {
                        await equipmentService.updateEquipmentStatus(item.id, item.status, session.user);
                    }
                } else {
                    await equipmentService.addEquipment(item, session.user);
                }
                results.successCount++;
            } catch (error) {
                results.failedCount++;
                results.errors.push({ index: i, name: item.name, message: error.message });
            }
        }

        return NextResponse.json(results, { status: 200 });

    } catch (error) {
        console.error('Bulk Import Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
