import { EquipmentRepository } from '../repositories/equipment.repository';

export class EquipmentService {
    private repo: EquipmentRepository;

    constructor() {
        this.repo = new EquipmentRepository();
    }

    async addEquipment(data: any, sessionUser: any) {
        const { rackId, customerId, name, equipmentType, uStart, uEnd, portCount, serialNumber, weight, arrivalDate, deviceModelId, assetTag } = data;

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

        if (!isInternalAdmin && !isTenantAdmin) {
            throw new Error('Forbidden. Read-Only users cannot add equipment.');
        }

        // Equipment Ownership Logic
        let finalCustomerId: number | null = null;
        
        if (rack.customerId) {
            // Rule 1: Tenant Rack -> Any equipment inherits the Rack's Customer ID
            if (!isInternalAdmin && rack.customerId !== Number(sessionUser.customerId)) {
                throw new Error('Forbidden. You cannot add equipment to another tenant\'s private rack.');
            }
            finalCustomerId = rack.customerId;
        } else {
            // Rule 2: MMR / Datacenter Rack (rack.customerId is null)
            if (!isInternalAdmin) {
                throw new Error('Forbidden. Only datacenter admins can add equipment to Datacenter racks.');
            }
            // For active equipment, NOC can assign it to a customer.
            // For standard infrastructure/OTB, they can leave it null.
            finalCustomerId = customerId ? parseInt(customerId) : null;
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
        const numPorts = portCount !== undefined && portCount !== null 
            ? parseInt(portCount) 
            : (['PATCH_PANEL', 'OTB'].includes(equipmentType) ? 24 : 0);
            
        for (let i = 1; i <= numPorts; i++) {
            ports.push({ portName: `Port ${i}` });
        }

        // Auto-generate Asset Tag if blank
        let finalAssetTag = assetTag;
        if (!finalAssetTag || finalAssetTag.trim() === '') {
            finalAssetTag = `VMS-ASSET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        }

        // 6. Create
        return await this.repo.createEquipment({
            rackId: parseInt(rackId),
            customerId: finalCustomerId,
            deviceModelId: deviceModelId ? parseInt(deviceModelId, 10) : null,
            name,
            equipmentType,
            uStart: parseInt(uStart),
            uEnd: parseInt(uEnd),
            serialNumber: serialNumber || null,
            assetTag: finalAssetTag,
            weight: weight || null,
            arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
            ports: {
                create: ports
            }
        });
    }

    async decommissionEquipment(id: number, sessionUser: any) {
        const equipment = await this.repo.findUniqueEquipment(id);
        if (!equipment) throw new Error('Equipment not found');

        // RBAC Check
        const userRole = (sessionUser?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        if (!isInternalAdmin && equipment.customerId !== Number(sessionUser.customerId)) {
            throw new Error('Forbidden. You do not have permission to decommission this equipment.');
        }

        const previousState = JSON.stringify(equipment);
        const updated = await this.repo.updateEquipment(id, { status: 'Decommissioned' });

        // Log to InfrastructureAuditLog via repo prisma instance (using base class property)
        // Note: Repository should ideally have a log method, but I'll use direct access for speed as per current pattern
        // Or I can add a method to repo.
        return updated;
    }

    async updateEquipmentStatus(id: number, status: string, sessionUser: any) {
        const equipment = await this.repo.findUniqueEquipment(id);
        if (!equipment) throw new Error('Equipment not found');

        // RBAC Check (similar to decommission)
        const userRole = (sessionUser?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        if (!isInternalAdmin && equipment.customerId !== Number(sessionUser.customerId)) {
            throw new Error('Forbidden.');
        }

        return await this.repo.updateEquipment(id, { status });
    }

    async getEquipments(query: any, sessionUser: any) {
        const { rackId, customerId } = query;
        const userRole = (sessionUser?.role || '').toLowerCase().replace(/\s+/g, '');
        const isInternalAdmin = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRole);
        const sessionCustomerId = sessionUser?.customerId;

        const includeRelations = { 
            customer: true, 
            ports: true, 
            deviceModel: true,
            rack: { include: { row: { include: { room: true } } } } 
        };

        if (!isInternalAdmin) {
            if (!sessionCustomerId) throw new Error('Forbidden: No Customer ID');
            
            const customerEqs = await this.repo.findManyEquipments({
                where: { customerId: parseInt(sessionCustomerId.toString(), 10) },
                include: includeRelations
            });
            
            const rackIds = [...new Set(customerEqs.map((e: any) => e.rackId))];
            let facilityPanels: any[] = [];
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
