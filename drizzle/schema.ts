import type { AdapterAccountType } from "@auth/core/adapters";
import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const assetTypeEnum = pgEnum("asset_type", [
  "real_estate",
  "vehicle",
  "crypto",
  "collectible",
  "other",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  ],
);

export const plaidItems = pgTable("plaid_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const financialAccounts = pgTable("financial_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: uuid("plaid_item_id").references(() => plaidItems.id, {
    onDelete: "set null",
  }),
  plaidAccountId: text("plaid_account_id"),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentBalance: numeric("current_balance", { precision: 19, scale: 4 })
    .notNull(),
  availableBalance: numeric("available_balance", { precision: 19, scale: 4 }),
  currency: text("currency").notNull().default("USD"),
  isManual: boolean("is_manual").notNull().default(false),
  assetClass: text("asset_class"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const manualAssets = pgTable("manual_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  assetType: assetTypeEnum("asset_type").notNull(),
  currentValue: numeric("current_value", { precision: 19, scale: 4 }).notNull(),
  purchaseValue: numeric("purchase_value", { precision: 19, scale: 4 }),
  purchaseDate: date("purchase_date"),
  address: text("address"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const balanceSnapshots = pgTable("balance_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  totalAssets: numeric("total_assets", { precision: 19, scale: 4 }).notNull(),
  totalLiabilities: numeric("total_liabilities", {
    precision: 19,
    scale: 4,
  }).notNull(),
  netWorth: numeric("net_worth", { precision: 19, scale: 4 }).notNull(),
  snapshotData: jsonb("snapshot_data"),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  plaidItems: many(plaidItems),
  financialAccounts: many(financialAccounts),
  manualAssets: many(manualAssets),
  balanceSnapshots: many(balanceSnapshots),
}));

export const plaidItemsRelations = relations(plaidItems, ({ one, many }) => ({
  user: one(users, {
    fields: [plaidItems.userId],
    references: [users.id],
  }),
  financialAccounts: many(financialAccounts),
}));

export const financialAccountsRelations = relations(
  financialAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [financialAccounts.userId],
      references: [users.id],
    }),
    plaidItem: one(plaidItems, {
      fields: [financialAccounts.plaidItemId],
      references: [plaidItems.id],
    }),
  }),
);
