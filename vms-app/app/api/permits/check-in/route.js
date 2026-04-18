import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PermitService } from '../../../../lib/services/permit.service';

export async function POST(req) {
    let body;
    try {
        body = await req.json();
        const { qrToken, visitorPhoto, validateOnly } = body;

        if (!qrToken) {
            return NextResponse.json({ error: 'QR Token is required' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const operatorId = session?.user?.id ? parseInt(session.user.id) : null;

        const permitService = new PermitService();
        const result = await permitService.processKioskScan(qrToken, {
            visitorPhoto,
            validateOnly,
            operatorId
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Check-in Validation Error Details:', {
            message: error.message,
            stack: error.stack,
            body: body
        });
        
        const isClientError = error.message.includes('Invalid') || error.message.includes('too early') || error.message.includes('expired') || error.message.includes('not ready');
        
        return NextResponse.json({ 
            error: error.message || 'Server configuration error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: isClientError ? 400 : 500 });
    }
}
