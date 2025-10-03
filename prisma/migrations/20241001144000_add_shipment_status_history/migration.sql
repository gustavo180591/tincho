-- Create shipment status history table
CREATE TABLE "ShipmentStatusHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "status" "ShipStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "ShipmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "ShipmentStatusHistory_shipmentId_idx" ON "ShipmentStatusHistory"("shipmentId");
CREATE INDEX "ShipmentStatusHistory_createdAt_idx" ON "ShipmentStatusHistory"("createdAt");

-- Add foreign key
ALTER TABLE "ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_shipmentId_fkey" 
    FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to User
ALTER TABLE "ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL;
