import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const sharedRecordsTable = pgTable("record_shares", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull(),
  senderId: integer("sender_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  message: text("message"),
  doctorReply: text("doctor_reply"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ShareRecordBody = z.object({
  doctorId: z.number().positive(),
  message: z.string().optional(),
});

export const SharedRecordSchema = z.object({
  id: z.number(),
  recordId: z.number(),
  senderId: z.number(),
  doctorId: z.number(),
  message: z.string().nullable(),
  doctorReply: z.string().nullable(),
  sentAt: z.string(),
  doctorName: z.string().nullable().optional(),
  senderName: z.string().nullable().optional(),
  record: z.any().optional(),
});
