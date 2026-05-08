import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const braceletReadingsTable = pgTable("bracelet_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  heartRate: integer("heart_rate").notNull(),
  spo2: integer("spo2").notNull(),
  steps: integer("steps").notNull(),
  activity: text("activity").notNull().$type<"resting" | "walking" | "active">(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  deviceId: text("device_id").notNull(),
});

export const insertBraceletReadingSchema = createInsertSchema(braceletReadingsTable);
export const selectBraceletReadingSchema = createSelectSchema(braceletReadingsTable);

export type BraceletReading = typeof braceletReadingsTable.$inferSelect;
export type InsertBraceletReading = typeof braceletReadingsTable.$inferInsert;
