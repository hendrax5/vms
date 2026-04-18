import { EquipmentRepository } from '../repositories/equipment.repository';

export class EquipmentService {
    private repo: EquipmentRepository;

    constructor() {
        this.repo = new EquipmentRepository();
    }

    async addEquipment(data: any, sessionUser: any) {
        const { rackId, customerId, name, equipmentType, uStart, uEnd, portCount } = data;

        // 1. Validation
        if (!rackId || !name || !equipmentType || !uStart || !uEnd) {
            throw new Error('Missing required fields');
        }
        if (uStart > uEnd) {
            throw new Error('uStart cannot be greater than uEnd');
        }

        // 2. Rack Check
        const rack = await this.repo.findRackById(parseInt(rackId));
        if (!rack) {
            throw new Error('Rack not found');
        }

        // 3. RBAC & Tenant Isolation
        const userRole = (sessionUser?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const isTenantAdmin = ['tenantadmin', 'tenantstaff'].includes(userRole);

        if (!isInternalAdmin) {
            if (!isTenantAdmin) {
                throw new Error('Forbidden. Read-Only users cannot add equipment.');
            }
            if (rack.customerId !== null && rack.customerId !== Number(sessionUser.customerId)) {
                throw new Error('Forbidden. You cannot add equipment to another tenant\'s private rack.');
            }
        }

        let finalCustomerId = customerId ? parseInt(customerId) : null;
        if (isTenantAdmin && !isInternalAdmin) {
            finalCustomerId = Number(sessionUser.customerId);
        }

        if (uEnd > rack.uCapacity || uStart < 1) {
            throw new Error(`Invalid U values. Rack capacity is 1 to ${rack.uCapacity}`);
        }

        // 4. Collision Check
        const existingEquipments = await this.repo.findEquipmentsInRack(parseInt(rackId));
        const collision = existingEquipments.find(eq => {
            return Math.max(eq.uStart, uStart) <= Math.min(eq.uEnd, uEnd);
        });

        if (collision) {
            throw new Error(`U-Space Collision! Equipment '${collision.name}' already occupies U${collision.uStart}-U${collision.uEnd}`);
        }

        // 5. Port Generation
        const ports = [];
        const numPorts = portCount ? parseInt(portCount) : (['PATCH_PANEL', 'OTB'].includes(equipmentType) ? 24 : 0);
        for (let i = 1; i <= numPorts; i++) {
            ports.push({ portName: `Port ${i}` });
        }

        // 6. Create
        return await this.repo.createEquipment({
            rackId: parseInt(rackId),
            customerId: finalCustomerId,
            name,
            equipmentType,
            uStart: parseInt(uStart),
            uEnd: parseInt(uEnd),
            ports: {
                create: ports
            }
        });
    }

    async getEquipments(query: any, sessionUser: any) {
        const { rackId, customerId } = query;
        const userRole = (sessionUser?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const sessionCustomerId = sessionUser?.customerId;

        const includeRelations = { 
            customer: true, 
            ports: true, 
            rack: { include: { row: { include: { room: true } } } } 
        };

        if (!isInternalAdmin) {
            if (!sessionCustomerId) throw new Error('Forbidden: No Customer ID');
            
            const customerEqs = await this.repo.findManyEquipments({
                where: { customerId: sessionCustomerId },
                include: includeRelations
            });
            
            const rackIds = [...new Set(customerEqs.map((e: any) => e.rackId))];
            let facilityPanels = [];
            if (rackIds.length > 0) {
                facilityPanels = await this.repo.findManyEquipments({
                    where: { 
                        rackId: { in: rackIds },
                        customerId: null,
                        equipmentType: 'PATCH_PANEL'
                    },
                    include: includeRelations
                });
            }
            return [...customerEqs, ...facilityPanels];
        }

        // Admin
        const where: any = {};
        if (customerId) where.customerId = parseInt(customerId);
        else if (rackId) where.rackId = parseInt(rackId);

        return await this.repo.findManyEquipments({
            where,
            include: includeRelations
        });
    }
}
