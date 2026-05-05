import { pgTable, text, serial, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pharmaciesTable = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  wilaya: text("wilaya").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  isOpenNow: boolean("is_open_now").notNull().default(true),
  is24h: boolean("is_24h").notNull().default(false),
  openTime: text("open_time").notNull().default("08:00"),
  closeTime: text("close_time").notNull().default("21:00"),
  medicinesJson: text("medicines_json").notNull().default("[]"),
  lat: real("lat"),
  lng: real("lng"),
});

export const insertPharmacySchema = createInsertSchema(pharmaciesTable).omit({ id: true });
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;
export type Pharmacy = typeof pharmaciesTable.$inferSelect;
