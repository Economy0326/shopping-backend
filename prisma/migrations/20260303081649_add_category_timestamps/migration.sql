/*
  Warnings:

  - The `status` column on the `Ask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentMethod` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `OrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RefundLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SystemPolicy` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `refreshTokenHash` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `SystemPolicy` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Ask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notice` table without a default value. This is not possible if the table is not empty.
  - Made the column `label` on table `ProductOption` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Return` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "AskStatus" AS ENUM ('WAITING', 'ANSWERED', 'CLOSED');

-- DropIndex
DROP INDEX "Category_slug_idx";

-- DropIndex
DROP INDEX "Order_status_expiresAt_idx";

-- DropIndex
DROP INDEX "Order_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Product_categorySlug_createdAt_idx";

-- DropIndex
DROP INDEX "RefundLog_orderId_createdAt_idx";

-- AlterTable
ALTER TABLE "Ask" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AskStatus" NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
ALTER COLUMN "grandTotal" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OrderItem_id_seq";

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProductOption" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "label" SET NOT NULL,
ALTER COLUMN "priceDelta" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "priceDelta" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "RefundLog" DROP CONSTRAINT "RefundLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "memo" DROP NOT NULL,
ADD CONSTRAINT "RefundLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RefundLog_id_seq";

-- AlterTable
ALTER TABLE "Return" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SystemPolicy" DROP CONSTRAINT "SystemPolicy_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SystemPolicy_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "refreshTokenHash",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshSession_revokedAt_idx" ON "RefreshSession"("revokedAt");

-- CreateIndex
CREATE INDEX "Ask_userId_idx" ON "Ask"("userId");

-- CreateIndex
CREATE INDEX "Ask_status_idx" ON "Ask"("status");

-- CreateIndex
CREATE INDEX "Ask_createdAt_idx" ON "Ask"("createdAt");

-- CreateIndex
CREATE INDEX "Ask_deletedAt_idx" ON "Ask"("deletedAt");

-- CreateIndex
CREATE INDEX "AskReply_askId_idx" ON "AskReply"("askId");

-- CreateIndex
CREATE INDEX "AskReply_createdAt_idx" ON "AskReply"("createdAt");

-- CreateIndex
CREATE INDEX "Notice_createdAt_idx" ON "Notice"("createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "Product_categorySlug_idx" ON "Product"("categorySlug");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sizeOptionId_idx" ON "ProductVariant"("sizeOptionId");

-- CreateIndex
CREATE INDEX "ProductVariant_colorOptionId_idx" ON "ProductVariant"("colorOptionId");

-- CreateIndex
CREATE INDEX "RefundLog_orderId_idx" ON "RefundLog"("orderId");

-- CreateIndex
CREATE INDEX "RefundLog_createdAt_idx" ON "RefundLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemPolicy_key_key" ON "SystemPolicy"("key");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categorySlug_fkey" FOREIGN KEY ("categorySlug") REFERENCES "Category"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
