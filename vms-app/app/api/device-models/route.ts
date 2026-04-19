import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const deviceModels = await prisma.deviceModel.findMany({
      orderBy: { brand: 'asc' }
    });
    return NextResponse.json(deviceModels);
  } catch (error) {
    console.error('Error fetching device models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device models' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brand, modelName, equipmentType, uSize, portCount, requiresSerialNumber, powerDrawW } = body;

    // Validate required fields
    if (!brand || !modelName || !equipmentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newModel = await prisma.deviceModel.create({
      data: {
        brand,
        modelName,
        equipmentType,
        uSize: parseInt(uSize, 10) || 1,
        portCount: parseInt(portCount, 10) || 0,
        requiresSerialNumber: requiresSerialNumber !== false, // default true
        powerDrawW: powerDrawW ? parseInt(powerDrawW, 10) : null
      }
    });

    return NextResponse.json(newModel, { status: 201 });
  } catch (error: any) {
    console.error('Error creating device model:', error);
    // Handle unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A device model with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create device model' },
      { status: 500 }
    );
  }
}
