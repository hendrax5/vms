import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const model = await prisma.deviceModel.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!model) {
      return NextResponse.json({ error: 'Device model not found' }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error fetching device model:', error);
    return NextResponse.json({ error: 'Failed to fetch device model' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { brand, modelName, equipmentType, uSize, portCount, requiresSerialNumber, powerDrawW } = body;

    const updatedModel = await prisma.deviceModel.update({
      where: { id: parseInt(id, 10) },
      data: {
        brand,
        modelName,
        equipmentType,
        uSize: uSize !== undefined ? parseInt(uSize, 10) : undefined,
        portCount: portCount !== undefined ? parseInt(portCount, 10) : undefined,
        requiresSerialNumber: requiresSerialNumber !== undefined ? requiresSerialNumber : undefined,
        powerDrawW: powerDrawW !== undefined ? (powerDrawW ? parseInt(powerDrawW, 10) : null) : undefined
      }
    });

    return NextResponse.json(updatedModel);
  } catch (error: any) {
    console.error('Error updating device model:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Device model not found' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A device model with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update device model' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Check if any equipment is currently using this model
    const usageCount = await prisma.rackEquipment.count({
      where: { deviceModelId: parseInt(id, 10) }
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete this model because it is used by ${usageCount} equipment(s) in the datacenter.` },
        { status: 400 }
      );
    }

    await prisma.deviceModel.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting device model:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Device model not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete device model' }, { status: 500 });
  }
}
