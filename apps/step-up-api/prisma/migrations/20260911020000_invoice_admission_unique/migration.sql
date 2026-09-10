-- One ADMISSION invoice per student per studio (concurrent enroll safety).
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_studio_student_admission_unique"
ON "Invoice" ("studioId", "studentId")
WHERE "chargeType" = 'ADMISSION';
