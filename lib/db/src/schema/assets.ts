import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "investment", "property", "crypto", "other"] }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("💵"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assetHistoryTable = pgTable("asset_history", {
  id: serial("id").primaryKey(),
  assetId: serial("asset_id").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
