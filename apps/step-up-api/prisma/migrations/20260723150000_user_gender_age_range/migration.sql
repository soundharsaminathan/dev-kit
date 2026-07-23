-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('UNDER_10', 'TEN_TO_TWENTY', 'TWENTY_TO_FORTY', 'FORTY_PLUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gender" "Gender",
ADD COLUMN "ageRange" "AgeRange";
