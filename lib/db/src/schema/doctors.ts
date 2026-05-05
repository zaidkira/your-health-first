import { pgTable, text, serial, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  wilaya: text("wilaya").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  rating: real("rating").notNull().default(4.0),
  reviewCount: integer("review_count").notNull().default(0),
  availableDays: text("available_days").notNull(),
  availableHours: text("available_hours").notNull().default("08:00 - 17:00"),
  consultationFee: real("consultation_fee").notNull(),
  imageUrl: text("image_url"),
  isOnlineConsultation: boolean("is_online_consultation").notNull().default(false),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
