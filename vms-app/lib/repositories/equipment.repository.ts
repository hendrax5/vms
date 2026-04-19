import { BaseRepository } from './base.repository';

export class EquipmentRepository extends BaseRepository {
    async findRackById(id: number) {
        return await this.prisma.rack.findUnique({ where: { id } });
    }

    async findEquipmentsInRack(rackId: number) {
        return await this.prisma.rackEquipment.findMany({
            where: { rackId }
        });
    }

    async createEquipment(data: any) {
        return await this.prisma.rackEquipment.create({
            data,
            include: { ports: true }
        });
    }

    async findManyEquipments(params: any) {
        return await this.prisma.rackEquipment.findMany(params);
    }

    async updateEquipment(id: number, data: any) {
        return await this.prisma.rackEquipment.update({
            where: { id },
            data,
            include: { ports: true }
        });
    }

    async deleteEquipment(id: number) {
        return await this.prisma.rackEquipment.delete({
            where: { id }
        });
    }

    async findUniqueEquipment(id: number) {
        return await this.prisma.rackEquipment.findUnique({
            where: { id },
            include: { customer: true, rack: true }
        });
    }

    async findEquipmentByAssetTag(assetTag: string) {
        return await this.prisma.rackEquipment.findUnique({
            where: { assetTag }
        });
    }
}
