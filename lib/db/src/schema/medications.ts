import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicationsTable = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  familyMemberId: integer("family_member_id"),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  times: text("times").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const medicationRemindersTable = pgTable("medication_reminders", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").notNull(),
  userId: integer("user_id").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  date: text("date").notNull(),
  taken: boolean("taken").notNull().default(false),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;
export type MedicationReminder = typeof medicationRemindersTable.$inferSelect;
