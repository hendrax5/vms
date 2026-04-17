const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ include: { role: true } });
  console.log("Users:", JSON.stringify(users, null, 2));
  
  const racks = await prisma.rack.findMany();
  console.log("Racks:", JSON.stringify(racks, null, 2));
  
  const eqs = await prisma.rackEquipment.findMany();
  console.log("Eqs:", JSON.stringify(eqs, null, 2));
}

main().finally(() => process.exit(0));
