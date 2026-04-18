import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { EquipmentService } from '../../../../lib/services/equipment.service';

export async function POST(req) {
    try {
        const body = await req.json();
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const equipmentService = new EquipmentService();
        const newEquipment = await equipmentService.addEquipment(body, session.user);

        return NextResponse.json(newEquipment, { status: 201 });

    } catch (error) {
        console.error('Rack Equipment Error:', error);
        const isForbidden = error.message.includes('Forbidden');
        const isConflict = error.message.includes('Collision');
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' }, 
            { status: isForbidden ? 403 : (isConflict ? 409 : 500) }
        );
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const rackId = searchParams.get('rackId');
        const customerId = searchParams.get('customerId');

        const equipmentService = new EquipmentService();
        const equipments = await equipmentService.getEquipments({ rackId, customerId }, session?.user);

        return NextResponse.json(equipments);
    } catch (error) {
        console.error('Fetch Equipments Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.message.includes('Forbidden') ? 403 : 500 });
    }
}
