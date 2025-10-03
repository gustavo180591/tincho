-- Create ReturnItem table
CREATE TABLE "ReturnItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "returnRequestId" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReturnItem_returnRequestId_fkey" 
    FOREIGN KEY ("returnRequestId") 
    REFERENCES "ReturnRequest"("id") ON DELETE CASCADE,
  CONSTRAINT "ReturnItem_orderItemId_fkey"
    FOREIGN KEY ("orderItemId")
    REFERENCES "OrderItem"("id") ON DELETE RESTRICT
);

-- Create Refund table
CREATE TABLE "Refund" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "returnRequestId" UUID NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'ARS',
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "paymentId" UUID,
  "reason" TEXT,
  "processedAt" TIMESTAMP(3),
  "processedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Refund_returnRequestId_fkey" 
    FOREIGN KEY ("returnRequestId") 
    REFERENCES "ReturnRequest"("id") ON DELETE CASCADE,
  CONSTRAINT "Refund_paymentId_fkey"
    FOREIGN KEY ("paymentId")
    REFERENCES "Payment"("id") ON DELETE SET NULL,
  CONSTRAINT "Refund_processedBy_fkey"
    FOREIGN KEY ("processedBy")
    REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");
CREATE INDEX "Refund_returnRequestId_idx" ON "Refund"("returnRequestId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- Add status enum types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_item_status') THEN
    CREATE TYPE "ReturnItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');
  END IF;
END $$;

-- Update ReturnRequest table to use the new ReturnItem and Refund tables
ALTER TABLE "ReturnRequest" 
  ADD COLUMN IF NOT EXISTS "refundId" UUID,
  ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD CONSTRAINT "ReturnRequest_refundId_fkey" 
    FOREIGN KEY ("refundId") 
    REFERENCES "Refund"("id") ON DELETE SET NULL;
