import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicalRecordsTable = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  familyMemberId: integer("family_member_id"),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  recordDate: text("record_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecordsTable).omit({ id: true, createdAt: true });
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecordsTable.$inferSelect;
