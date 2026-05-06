import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chronicConditionsTable = pgTable("chronic_conditions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  diagnosedYear: text("diagnosed_year"),
  severity: text("severity"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChronicConditionSchema = createInsertSchema(chronicConditionsTable).omit({ id: true, createdAt: true });
export type InsertChronicCondition = z.infer<typeof insertChronicConditionSchema>;
export type ChronicCondition = typeof chronicConditionsTable.$inferSelect;
