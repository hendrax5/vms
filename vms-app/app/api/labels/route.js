import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'rack' or 'cross-connect'
        const id = searchParams.get('id');

        if (!type || !id) {
             return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
        }

        let docData = null;

        if (type === 'cross-connect') {
             const cx = await prisma.crossConnect.findUnique({
                 where: { id: parseInt(id) },
                 include: { sideARack: true, sideZRack: true, customer: true, site: true }
             });
             if (!cx) return NextResponse.json({ error: 'Cross-connect not found' }, { status: 404 });
             
             docData = {
                 title: 'DCIM Cross-Connect Label',
                 info: [
                     `Connection ID: CX-${cx.id}`,
                     `Customer: ${cx.customer ? cx.customer.name : 'Internal'}`,
                     `Media: ${cx.mediaType}`,
                     `Date: ${new Date(cx.createdAt).toLocaleDateString()}`,
                     `--- A-SIDE ---`,
                     `Rack: ${cx.sideARack.name} | Port: ${cx.sideAPort}`,
                     `--- Z-SIDE ---`,
                     `Rack: ${cx.sideZRack.name} | Port: ${cx.sideZPort}`,
                 ]
             };
        } else if (type === 'rack') {
             const eq = await prisma.rackEquipment.findUnique({
                 where: { id: parseInt(id) },
                 include: { rack: { include: { site: true } }, customer: true }
             });
             if (!eq) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

             docData = {
                 title: 'DCIM Rack Equipment Tag',
                 info: [
                     `Equipment ID: RE-${eq.id}`,
                     `Name: ${eq.name}`,
                     `Customer: ${eq.customer ? eq.customer.name : 'Internal'}`,
                     `Location: ${eq.rack.site.name} - Rack ${eq.rack.name}`,
                     `U-Space: U${eq.uStart} to U${eq.uEnd}`,
                     `Status: ${eq.status}`,
                 ]
             };
        } else {
             return NextResponse.json({ error: 'Invalid label type' }, { status: 400 });
        }

        // Generate PDF
        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: [250, 200], margin: 15 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text(docData.title, { align: 'center' });
            
            doc.moveDown(0.5);
            
            doc.font('Helvetica')
               .fontSize(10);
            
            docData.info.forEach(line => {
                doc.text(line, { align: 'left' });
            });

            // Antigravity Watermark
            doc.moveDown(1);
            doc.fontSize(7).fillColor('gray').text('Antigravity Infrastructure Systems', { align: 'center' });

            doc.end();
        });

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${type}-label-${id}.pdf"`
            }
        });

    } catch (error) {
        console.error('PDF Generator Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
