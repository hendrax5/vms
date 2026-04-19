import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const datacenterId = searchParams.get('datacenterId');

        const userRole = session?.user?.role?.toLowerCase().replace(/\s+/g, '') || '';
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);

        const where = {};
        if (datacenterId) where.datacenterId = parseInt(datacenterId);
        
        if (!isInternalAdmin) {
            const sessionCustomerId = session?.user?.customerId;
            if (!sessionCustomerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            where.customerId = parseInt(sessionCustomerId, 10);
        }

        const items = await prisma.goodsItem.findMany({
            where,
            include: { customer: true, datacenter: true },
            orderBy: { createdAt: 'desc' }
        });

        // Prepare data for Excel
        const excelData = items.map((item, index) => ({
            'No': index + 1,
            'Customer': item.customer?.name || 'Internal',
            'Nama Perangkat': item.name,
            'Serial Number': item.serialNumber || '-',
            'Berat (kg)': item.weight || '-',
            'Status': item.status,
            'Tanggal Masuk': item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString('id-ID') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'),
            'QR Code': item.qrCode
        }));

        // Create Workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Logistics Report');

        // Set column widths
        const wscols = [
            { wch: 5 },  // No
            { wch: 25 }, // Customer
            { wch: 30 }, // Nama Perangkat
            { wch: 20 }, // SN
            { wch: 10 }, // Berat
            { wch: 15 }, // Status
            { wch: 15 }, // Tgl Masuk
            { wch: 20 }  // QR
        ];
        worksheet['!cols'] = wscols;

        // Generate buffer
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buf, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="VMS_Logistics_Report.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

    } catch (error) {
        console.error('Export Excel Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
