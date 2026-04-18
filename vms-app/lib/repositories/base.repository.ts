import prisma from '../prisma';

export class BaseRepository {
    protected prisma = prisma;

    async findMany(model: any, params: any = {}) {
        return await (this.prisma as any)[model].findMany(params);
    }

    async findUnique(model: any, params: any) {
        return await (this.prisma as any)[model].findUnique(params);
    }

    async create(model: any, data: any) {
        return await (this.prisma as any)[model].create({ data });
    }

    async update(model: any, params: any) {
        return await (this.prisma as any)[model].update(params);
    }

    async delete(model: any, params: any) {
        return await (this.prisma as any)[model].delete(params);
    }
}
