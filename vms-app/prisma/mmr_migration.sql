-- Add MMR port columns to CrossConnect table
ALTER TABLE "CrossConnect" ADD COLUMN IF NOT EXISTS "mmrSideAPortId" INTEGER;
ALTER TABLE "CrossConnect" ADD COLUMN IF NOT EXISTS "mmrSideZPortId" INTEGER;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrossConnect_mmrSideAPortId_fkey') THEN
        ALTER TABLE "CrossConnect" ADD CONSTRAINT "CrossConnect_mmrSideAPortId_fkey"
            FOREIGN KEY ("mmrSideAPortId") REFERENCES "EquipmentPort"("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrossConnect_mmrSideZPortId_fkey') THEN
        ALTER TABLE "CrossConnect" ADD CONSTRAINT "CrossConnect_mmrSideZPortId_fkey"
            FOREIGN KEY ("mmrSideZPortId") REFERENCES "EquipmentPort"("id") ON DELETE SET NULL;
    END IF;
END $$;
