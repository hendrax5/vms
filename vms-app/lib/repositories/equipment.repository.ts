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
}
