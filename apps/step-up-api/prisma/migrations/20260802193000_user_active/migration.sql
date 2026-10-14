-- Soft-deactivate support for studio members (students first).
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
