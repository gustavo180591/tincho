-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT', 'PAYPAL', 'MERCADO_PAGO', 'OTHER');

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastFour" VARCHAR(4),
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "cardBrand" VARCHAR(50),
    "bankName" VARCHAR(100),
    "accountHolderName" VARCHAR(200),
    "email" VARCHAR(255),
    "provider" VARCHAR(50) NOT NULL,
    "providerId" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");
CREATE INDEX "PaymentMethod_userId_isDefault_idx" ON "PaymentMethod"("userId", "isDefault");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
