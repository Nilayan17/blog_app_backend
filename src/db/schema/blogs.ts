import { integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const blogsTable = pgTable("blogs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  content: varchar({ length: 255 }).notNull(),
  owner_id: integer().references(()=>usersTable.id),
  created_at: timestamp({ mode: "string" }).defaultNow().notNull(),
});
