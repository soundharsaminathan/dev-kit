-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('GROQ', 'GEMINI', 'OPENAI');

-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN "aiProvider" "AiProvider";
ALTER TABLE "StudioSettings" ADD COLUMN "aiApiKey" TEXT;
ALTER TABLE "StudioSettings" ADD COLUMN "aiApiKeyIv" TEXT;
ALTER TABLE "StudioSettings" ADD COLUMN "aiChatModel" TEXT;
