import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const sharedRecordsTable = pgTable("shared_records", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull(),
  senderId: integer("sender_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  message: text("message"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SharedRecord = typeof sharedRecordsTable.$inferSelect;
