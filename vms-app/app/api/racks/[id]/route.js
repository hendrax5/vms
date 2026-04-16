import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function DELETE(req, props) {
    try {
        const params = await props.params;
        await prisma.rack.delete({
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
        if (body.uCapacity) body.uCapacity = parseInt(body.uCapacity);
        const updated = await prisma.rack.update({
            where: { id: parseInt(params.id) },
            data: body
        });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req, props) {
    try {
        const params = await props.params;
        const rackId = parseInt(params.id);

        const rack = await prisma.rack.findUnique({
            where: { id: rackId },
            include: {
                row: {
                    include: {
                        room: {
                            include: {
                                datacenter: true
                            }
                        }
                    }
                },
                equipments: {
                    include: {
                        ports: {
                            include: {
                                crossConnectA: {
                                    include: {
                                        sideZPort: {
                                            include: {
                                                equipment: {
                                                    include: { rack: true }
                                                }
                                            }
                                        }
                                    }
                                },
                                crossConnectZ: {
                                    include: {
                                        sideAPort: {
                                            include: {
                                                equipment: {
                                                    include: { rack: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!rack) {
            return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
        }

        return NextResponse.json(rack);
    } catch (error) {
        console.error('Error fetching rack details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
