/*
  Warnings:

  - Added the required column `metric` to the `Covenant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CovenantMetric" AS ENUM ('DSCR', 'LIQUIDITY', 'LEVERAGE', 'EBITDA', 'INTEREST_COVER');

-- CreateEnum
CREATE TYPE "CovenantOperator" AS ENUM ('GTE', 'LTE');

-- AlterTable: Add columns as nullable first
ALTER TABLE "Covenant" ADD COLUMN "metric" "CovenantMetric";
ALTER TABLE "Covenant" ADD COLUMN "operator" "CovenantOperator" DEFAULT 'GTE';

-- Backfill existing covenants based on code
UPDATE "Covenant" SET "metric" = 'DSCR', "operator" = 'GTE' WHERE "code" = 'DSCR_MIN';
UPDATE "Covenant" SET "metric" = 'LIQUIDITY', "operator" = 'GTE' WHERE "code" = 'LIQ_MIN';

-- Make metric NOT NULL now that all rows have values
ALTER TABLE "Covenant" ALTER COLUMN "metric" SET NOT NULL;
ALTER TABLE "Covenant" ALTER COLUMN "operator" SET NOT NULL;
