import { PermitRepository } from '../repositories/permit.repository';

export class PermitService {
    private repo: PermitRepository;

    constructor() {
        this.repo = new PermitRepository();
    }

    async processKioskScan(token: string, options: { visitorPhoto?: string, validateOnly?: boolean, operatorId?: number | null }) {
        const { visitorPhoto, validateOnly, operatorId } = options;

        // 1. Try Visit Permit
        const permit = await this.repo.findByToken(token);
        if (permit) {
            return await this.handlePermitScan(permit, { visitorPhoto, validateOnly, operatorId });
        }

        // 2. Try Goods Item
        const goods = await this.repo.findGoodsByQR(token);
        if (goods) {
            return await this.handleGoodsScan(goods, { operatorId });
        }

        throw new Error('Invalid or Expired QR Token');
    }

    private async handlePermitScan(permit: any, options: any) {
        const { visitorPhoto, validateOnly, operatorId } = options;
        const now = new Date();

        // AUTO-CHECKOUT LOGIC
        if (permit.status === 'CheckIn' && !validateOnly) {
            await this.repo.updateStatus(permit.id, 'CheckOut', { checkOutAt: now });
            await this.repo.createLog(permit.id, 'CheckOut', 'Visitor auto-scanned QR at Kiosk for Check-Out.');
            return {
                success: true,
                type: 'CHECKOUT',
                visitor: permit.visitorNames,
                message: 'Auto Check-Out Successful. Thank you for your visit.'
            };
        }

        if (validateOnly) {
            return {
                success: true,
                type: 'PERMIT',
                permitId: permit.id,
                visitorNames: permit.visitorNames,
                status: permit.status,
                isCheckoutNeeded: permit.status === 'CheckIn',
                datacenter: permit.datacenter?.name
            };
        }

        if (permit.status !== 'NDASigned' && permit.status !== 'Approved') {
            throw new Error('Permit is not ready for Check In (Ensure permit is Approved)');
        }

        // Validate time
        const scheduled = new Date(permit.scheduledAt);
        const isSameDay = now.toDateString() === scheduled.toDateString();
        
        if (!isSameDay) {
            const timeDiffMins = (scheduled.getTime() - now.getTime()) / 60000;
            if (timeDiffMins > 720) {
                const hour = scheduled.getHours().toString().padStart(2, '0');
                const minute = scheduled.getMinutes().toString().padStart(2, '0');
                throw new Error(`Check-in is too early. Your permit is scheduled for ${scheduled.toLocaleDateString()} at ${hour}:${minute}.`);
            }
            if (timeDiffMins < -1440) {
                throw new Error('Permit has expired. Please schedule a new visit.');
            }
        }

        // Process Kiosk Verification
        const updatedPermit = await this.repo.updateStatus(permit.id, 'KioskVerified', {
            checkInAt: now,
            ...(visitorPhoto && { visitorPhoto })
        });

        await this.repo.createLog(permit.id, 'KioskVerified', 
            visitorPhoto ? 'Visitor verified QR and registered identity photo at Kiosk.' : 'Visitor verified QR and scanned at Kiosk.'
        );

        await this.repo.createSystemAudit({
            userId: operatorId,
            action: 'KIOSK_CHECKIN',
            resource: `VisitPermit PRM-${permit.id}`,
            details: `Visitor: ${permit.visitorNames} | Company: ${permit.customer?.name || permit.companyName} | DC: ${permit.datacenter?.name}`,
        });

        return {
            success: true,
            type: 'PERMIT',
            visitor: updatedPermit.visitorNames,
            message: 'Check-In Successful. Proceed to assigned zones.'
        };
    }

    private async handleGoodsScan(goods: any, options: any) {
        const { operatorId } = options;
        const now = new Date();

        const updatedGoods = await this.repo.updateGoodsStatus(goods.id, 'CheckedIn', {
            scannedAt: now
        });

        await this.repo.createSystemAudit({
            userId: operatorId,
            action: 'GOODS_SCAN',
            resource: `GoodsItem ${goods.qrCode}`,
            details: `Item: ${goods.name} | Status: CheckedIn | Company: ${goods.customer?.name} | DC: ${goods.datacenter?.name}`,
        });

        return {
            success: true,
            type: 'GOODS',
            itemName: updatedGoods.name,
            message: `Logistics Item ${updatedGoods.qrCode} has been verified at the kiosk.`
        };
    }
}
