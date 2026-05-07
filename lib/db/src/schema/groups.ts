import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMessagesTable = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupMessage = typeof groupMessagesTable.$inferSelect;
