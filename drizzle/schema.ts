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

export const accountAccessibilityEnum = pgEnum("account_accessibility", [
  "immediate",
  "reachable",
  "locked",
]);

export const milestoneTypeEnum = pgEnum("milestone_type", ["category", "tier"]);

export const contingencyScenarioEnum = pgEnum("contingency_scenario", [
  "job_loss",
  "big_expense",
  "downturn",
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
  transactionsCursor: text("transactions_cursor"),
  lastTransactionsSyncAt: timestamp("last_transactions_sync_at", {
    mode: "date",
  }),
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
  displayName: text("display_name"),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentBalance: numeric("current_balance", { precision: 19, scale: 4 })
    .notNull(),
  availableBalance: numeric("available_balance", { precision: 19, scale: 4 }),
  currency: text("currency").notNull().default("USD"),
  isManual: boolean("is_manual").notNull().default(false),
  excludeFromBudget: boolean("exclude_from_budget").notNull().default(false),
  assetClass: text("asset_class"),
  accessibility: accountAccessibilityEnum("accessibility"),
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
  assetClassOverride: text("asset_class_override"),
  marketSymbol: text("market_symbol"),
  marketQuantity: numeric("market_quantity", { precision: 19, scale: 4 }),
  accessibility: accountAccessibilityEnum("accessibility"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const budgetCategories = pgTable("budget_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("CircleDollarSign"),
  isSystem: boolean("is_system").notNull().default(false),
  isIncome: boolean("is_income").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  rolloverEnabled: boolean("rollover_enabled").notNull().default(false),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Per-user overrides for shared system categories. System buckets are global
 * rows (userId null), so per-user flags like rollover must live here.
 */
export const budgetCategoryPrefs = pgTable(
  "budget_category_prefs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => budgetCategories.id, { onDelete: "cascade" }),
    rolloverEnabled: boolean("rollover_enabled").notNull().default(false),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categoryId] })],
);

export const budgetTags = pgTable("budget_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const budgetTargets = pgTable(
  "budget_targets",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => budgetCategories.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categoryId, t.month] })],
);

export const merchantRules = pgTable("merchant_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  merchantKey: text("merchant_key").notNull(),
  displayName: text("display_name"),
  defaultCategoryId: uuid("default_category_id").references(
    () => budgetCategories.id,
    { onDelete: "set null" },
  ),
  defaultTagIds: jsonb("default_tag_ids").$type<string[]>().default([]),
  requiresReview: boolean("requires_review").notNull().default(false),
  applyToFuture: boolean("apply_to_future").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  financialAccountId: uuid("financial_account_id")
    .notNull()
    .references(() => financialAccounts.id, { onDelete: "cascade" }),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  plaidAccountId: text("plaid_account_id").notNull(),
  date: date("date").notNull(),
  authorizedDate: date("authorized_date"),
  amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  pending: boolean("pending").notNull().default(false),
  paymentChannel: text("payment_channel"),
  plaidCategory: jsonb("plaid_category"),
  primaryCategory: text("primary_category"),
  detailedCategory: text("detailed_category"),
  userCategoryId: uuid("user_category_id").references(() => budgetCategories.id, {
    onDelete: "set null",
  }),
  includeInBudget: boolean("include_in_budget").notNull().default(true),
  note: text("note"),
  isTransfer: boolean("is_transfer").notNull().default(false),
  reviewStatus: text("review_status"),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  subscriptionGroupId: uuid("subscription_group_id"),
  duplicateOfTransactionId: uuid("duplicate_of_transaction_id"),
  hasSplits: boolean("has_splits").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const transactionSplits = pgTable("transaction_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => budgetCategories.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const recurringBills = pgTable("recurring_bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  merchantKey: text("merchant_key"),
  expectedAmount: numeric("expected_amount", { precision: 19, scale: 4 }).notNull(),
  cadence: text("cadence").notNull().default("monthly"),
  nextDueDate: date("next_due_date").notNull(),
  categoryId: uuid("category_id").references(() => budgetCategories.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const savedReports = pgTable("saved_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const transactionTags = pgTable(
  "transaction_tags",
  {
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => budgetTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })],
);

export const budgetUserSettings = pgTable("budget_user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  includePendingInBudget: boolean("include_pending_in_budget")
    .notNull()
    .default(false),
  monthlyBudgetTotal: numeric("monthly_budget_total", {
    precision: 19,
    scale: 4,
  }),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const subscriptionGroups = pgTable("subscription_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  merchantKey: text("merchant_key").notNull(),
  displayName: text("display_name").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 19, scale: 4 }).notNull(),
  cadence: text("cadence").notNull(),
  nextExpectedDate: date("next_expected_date"),
  categoryId: uuid("category_id").references(() => budgetCategories.id, {
    onDelete: "set null",
  }),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
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

export const lifePlans = pgTable("life_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  swr: numeric("swr", { precision: 6, scale: 4 }).notNull().default("0.0400"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const lifePhases = pgTable("life_phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  lifePlanId: uuid("life_plan_id")
    .notNull()
    .references(() => lifePlans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lifeExpenseCategories = pgTable("life_expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  lifePlanId: uuid("life_plan_id")
    .notNull()
    .references(() => lifePlans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  annualAmount: numeric("annual_amount", { precision: 19, scale: 4 })
    .notNull()
    .default("0"),
  isEssential: boolean("is_essential").notNull().default(true),
  phaseId: uuid("phase_id").references(() => lifePhases.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tierAssumptions = pgTable("tier_assumptions", {
  lifePlanId: uuid("life_plan_id")
    .primaryKey()
    .references(() => lifePlans.id, { onDelete: "cascade" }),
  swr: numeric("swr", { precision: 6, scale: 4 }).notNull().default("0.0400"),
  expectedReturn: numeric("expected_return", { precision: 6, scale: 4 })
    .notNull()
    .default("0.0700"),
  targetYear: integer("target_year"),
  partTimeIncome: numeric("part_time_income", { precision: 19, scale: 4 })
    .notNull()
    .default("12000"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const milestoneEvents = pgTable("milestone_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  lifePlanId: uuid("life_plan_id")
    .notNull()
    .references(() => lifePlans.id, { onDelete: "cascade" }),
  type: milestoneTypeEnum("type").notNull(),
  ref: text("ref").notNull(),
  securedAt: timestamp("secured_at", { mode: "date" }).notNull().defaultNow(),
  bufferClearAt: timestamp("buffer_clear_at", { mode: "date" }),
});

export const contingencyPlans = pgTable("contingency_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  lifePlanId: uuid("life_plan_id")
    .notNull()
    .references(() => lifePlans.id, { onDelete: "cascade" }),
  scenario: contingencyScenarioEnum("scenario").notNull(),
  levers: jsonb("levers")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  savedAt: timestamp("saved_at", { mode: "date" }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  plaidItems: many(plaidItems),
  financialAccounts: many(financialAccounts),
  manualAssets: many(manualAssets),
  balanceSnapshots: many(balanceSnapshots),
  budgetCategories: many(budgetCategories),
  budgetTags: many(budgetTags),
  transactions: many(transactions),
  merchantRules: many(merchantRules),
  budgetSettings: one(budgetUserSettings),
  lifePlan: one(lifePlans),
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
  ({ one, many }) => ({
    user: one(users, {
      fields: [financialAccounts.userId],
      references: [users.id],
    }),
    plaidItem: one(plaidItems, {
      fields: [financialAccounts.plaidItemId],
      references: [plaidItems.id],
    }),
    transactions: many(transactions),
  }),
);

export const budgetCategoriesRelations = relations(
  budgetCategories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [budgetCategories.userId],
      references: [users.id],
    }),
    transactions: many(transactions),
    targets: many(budgetTargets),
  }),
);

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  financialAccount: one(financialAccounts, {
    fields: [transactions.financialAccountId],
    references: [financialAccounts.id],
  }),
  userCategory: one(budgetCategories, {
    fields: [transactions.userCategoryId],
    references: [budgetCategories.id],
  }),
  duplicateOf: one(transactions, {
    fields: [transactions.duplicateOfTransactionId],
    references: [transactions.id],
    relationName: "duplicateOf",
  }),
  transactionTags: many(transactionTags),
  splits: many(transactionSplits),
}));

export const transactionSplitsRelations = relations(
  transactionSplits,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionSplits.transactionId],
      references: [transactions.id],
    }),
    category: one(budgetCategories, {
      fields: [transactionSplits.categoryId],
      references: [budgetCategories.id],
    }),
  }),
);

export const recurringBillsRelations = relations(recurringBills, ({ one }) => ({
  user: one(users, {
    fields: [recurringBills.userId],
    references: [users.id],
  }),
  category: one(budgetCategories, {
    fields: [recurringBills.categoryId],
    references: [budgetCategories.id],
  }),
}));

export const lifePlansRelations = relations(lifePlans, ({ one, many }) => ({
  user: one(users, {
    fields: [lifePlans.userId],
    references: [users.id],
  }),
  phases: many(lifePhases),
  expenseCategories: many(lifeExpenseCategories),
  tierAssumptions: one(tierAssumptions),
  milestoneEvents: many(milestoneEvents),
  contingencyPlans: many(contingencyPlans),
}));

export const lifePhasesRelations = relations(lifePhases, ({ one, many }) => ({
  lifePlan: one(lifePlans, {
    fields: [lifePhases.lifePlanId],
    references: [lifePlans.id],
  }),
  expenseCategories: many(lifeExpenseCategories),
}));

export const lifeExpenseCategoriesRelations = relations(
  lifeExpenseCategories,
  ({ one }) => ({
    lifePlan: one(lifePlans, {
      fields: [lifeExpenseCategories.lifePlanId],
      references: [lifePlans.id],
    }),
    phase: one(lifePhases, {
      fields: [lifeExpenseCategories.phaseId],
      references: [lifePhases.id],
    }),
  }),
);

export const tierAssumptionsRelations = relations(tierAssumptions, ({ one }) => ({
  lifePlan: one(lifePlans, {
    fields: [tierAssumptions.lifePlanId],
    references: [lifePlans.id],
  }),
}));

export const milestoneEventsRelations = relations(milestoneEvents, ({ one }) => ({
  lifePlan: one(lifePlans, {
    fields: [milestoneEvents.lifePlanId],
    references: [lifePlans.id],
  }),
}));

export const contingencyPlansRelations = relations(
  contingencyPlans,
  ({ one }) => ({
    lifePlan: one(lifePlans, {
      fields: [contingencyPlans.lifePlanId],
      references: [lifePlans.id],
    }),
  }),
);
