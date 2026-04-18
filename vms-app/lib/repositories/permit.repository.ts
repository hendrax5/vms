import { BaseRepository } from './base.repository';

export class PermitRepository extends BaseRepository {
    async findByToken(token: string) {
        return await this.prisma.visitPermit.findUnique({
            where: { qrCodeToken: token },
            include: {
                customer: true,
                datacenter: true
            }
        });
    }

    async findGoodsByQR(qrCode: string) {
        return await this.prisma.goodsItem.findUnique({
            where: { qrCode },
            include: {
                customer: true,
                datacenter: true
            }
        });
    }

    async updateStatus(id: number, status: string, additionalData: any = {}) {
        return await this.prisma.visitPermit.update({
            where: { id },
            data: {
                status,
                ...additionalData
            }
        });
    }

    async updateGoodsStatus(id: number, status: string, additionalData: any = {}) {
        return await this.prisma.goodsItem.update({
            where: { id },
            data: {
                status,
                ...additionalData
            }
        });
    }

    async createLog(permitId: number, status: string, message: string) {
        return await this.prisma.permitEventLog.create({
            data: {
                permitId,
                status,
                message
            }
        });
    }

    async createSystemAudit(data: any) {
        return await this.prisma.systemAuditLog.create({
            data
        });
    }
}
