import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const topology = await prisma.datacenter.findMany({
            include: {
                region: true,
                rooms: {
                    include: {
                        rows: {
                            include: {
                                racks: {
                                    include: {
                                        equipments: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        return NextResponse.json(topology);
    } catch (error) {
        console.error('Topology generation error:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
