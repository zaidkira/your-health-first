import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const connectionsRelations = relations(connectionsTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [connectionsTable.senderId],
    references: [usersTable.id],
    relationName: "sender",
  }),
  receiver: one(usersTable, {
    fields: [connectionsTable.receiverId],
    references: [usersTable.id],
    relationName: "receiver",
  }),
}));
