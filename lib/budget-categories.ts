import { bucketSlugForPlaid } from "@/lib/plaid-pfc-map";
import { SYSTEM_CATEGORY_SEEDS } from "@/lib/budget-category-seeds";
import { budgetCategories } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, asc, eq, isNull, or } from "drizzle-orm";

export type BudgetCategoryRow = typeof budgetCategories.$inferSelect;

let systemCategoriesCache: BudgetCategoryRow[] | null = null;

function pickPreferredCategory(
  a: BudgetCategoryRow,
  b: BudgetCategoryRow,
): BudgetCategoryRow {
  if (a.isSystem !== b.isSystem) {
    return a.isSystem ? a : b;
  }
  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt < b.createdAt ? a : b;
  }
  return a.id < b.id ? a : b;
}

/** One global row per system slug; skip user buckets whose label matches a system bucket. */
export function dedupeBudgetCategories(
  rows: BudgetCategoryRow[],
): BudgetCategoryRow[] {
  const systemBySlug = new Map<string, BudgetCategoryRow>();
  const userBuckets: BudgetCategoryRow[] = [];

  for (const row of rows) {
    if (row.userId != null) {
      userBuckets.push(row);
      continue;
    }
    const existing = systemBySlug.get(row.slug);
    systemBySlug.set(
      row.slug,
      existing ? pickPreferredCategory(row, existing) : row,
    );
  }

  const systemLabels = new Set(
    [...systemBySlug.values()].map((c) => c.label.trim().toLowerCase()),
  );

  const uniqueUser = userBuckets.filter(
    (c) => !systemLabels.has(c.label.trim().toLowerCase()),
  );

  return [...systemBySlug.values(), ...uniqueUser].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export async function ensureSystemBudgetCategories(): Promise<
  BudgetCategoryRow[]
> {
  const existing = await db.query.budgetCategories.findMany({
    where: and(
      isNull(budgetCategories.userId),
      eq(budgetCategories.isSystem, true),
    ),
  });

  const bySlug = new Map<string, BudgetCategoryRow>();
  for (const row of existing) {
    const prev = bySlug.get(row.slug);
    bySlug.set(row.slug, prev ? pickPreferredCategory(row, prev) : row);
  }
  const result: BudgetCategoryRow[] = [];

  for (const seed of SYSTEM_CATEGORY_SEEDS) {
    const found = bySlug.get(seed.slug);
    if (found) {
      result.push(found);
      continue;
    }

    const [inserted] = await db
      .insert(budgetCategories)
      .values({
        userId: null,
        slug: seed.slug,
        label: seed.label,
        icon: seed.icon,
        isSystem: true,
        isIncome: seed.isIncome ?? false,
        sortOrder: seed.sortOrder,
      })
      .returning();
    result.push(inserted);
  }

  const sorted = result.sort((a, b) => a.sortOrder - b.sortOrder);
  if (sorted.length >= SYSTEM_CATEGORY_SEEDS.length) {
    systemCategoriesCache = sorted;
  }
  return sorted;
}

export function clearSystemCategoriesCache(): void {
  systemCategoriesCache = null;
}

export async function getSystemCategoryBySlug(
  slug: string,
): Promise<BudgetCategoryRow | undefined> {
  const categories = await ensureSystemBudgetCategories();
  return categories.find((c) => c.slug === slug);
}

export async function resolveCategoryIdForPlaid(
  primary: string | null | undefined,
  detailed: string | null | undefined,
): Promise<string | null> {
  const slug = bucketSlugForPlaid(primary, detailed);
  const category = await getSystemCategoryBySlug(slug);
  return category?.id ?? (await getSystemCategoryBySlug("other"))?.id ?? null;
}

export async function listBudgetCategoriesForUser(
  userId: string,
): Promise<BudgetCategoryRow[]> {
  await ensureSystemBudgetCategories();

  const rows = await db.query.budgetCategories.findMany({
    where: and(
      or(
        isNull(budgetCategories.userId),
        eq(budgetCategories.userId, userId),
      ),
      isNull(budgetCategories.deletedAt),
    ),
    orderBy: [asc(budgetCategories.sortOrder), asc(budgetCategories.label)],
  });

  return dedupeBudgetCategories(rows);
}

/** Spend buckets for transaction pickers (excludes income + transfer). */
export async function listSpendCategoriesForPicker(
  userId: string,
): Promise<BudgetCategoryRow[]> {
  const categories = await listBudgetCategoriesForUser(userId);
  return categories.filter((c) => !c.isIncome && c.slug !== "transfer");
}

/**
 * Maps any category row id (including soft-deleted duplicates) to the active id for that slug.
 */
export async function buildCategoryIdRemap(
  userId: string,
  activeCategories: BudgetCategoryRow[],
): Promise<Map<string, string>> {
  const canonicalBySlug = new Map(
    activeCategories.map((c) => [c.slug, c.id]),
  );
  const remap = new Map<string, string>();

  const allRows = await db.query.budgetCategories.findMany({
    where: or(
      isNull(budgetCategories.userId),
      eq(budgetCategories.userId, userId),
    ),
  });

  for (const row of allRows) {
    const canonicalId = canonicalBySlug.get(row.slug);
    if (canonicalId) {
      remap.set(row.id, canonicalId);
    }
  }

  return remap;
}

export function resolveCanonicalCategoryId(
  userCategoryId: string | null,
  categoryById: Map<string, BudgetCategoryRow>,
  idRemap: Map<string, string>,
): string | null {
  if (!userCategoryId) return null;
  if (categoryById.has(userCategoryId)) return userCategoryId;
  const mapped = idRemap.get(userCategoryId);
  if (mapped && categoryById.has(mapped)) return mapped;
  return null;
}

/** All category row ids that roll up to the canonical bucket id (includes legacy duplicates). */
export function categoryIdsForCanonical(
  canonicalId: string,
  idRemap: Map<string, string>,
): string[] {
  const ids = new Set<string>([canonicalId]);
  for (const [oldId, mapped] of idRemap) {
    if (mapped === canonicalId) ids.add(oldId);
  }
  return [...ids];
}

export function isTransferCategory(
  primary: string | null | undefined,
  detailed: string | null | undefined,
): boolean {
  const slug = bucketSlugForPlaid(primary, detailed);
  if (slug === "transfer") return true;
  const p = primary ?? "";
  const d = detailed ?? "";
  if (p === "TRANSFER_IN" || p === "TRANSFER_OUT") return true;
  if (d.includes("CREDIT_CARD_PAYMENT")) return true;
  if (d.includes("LOAN_PAYMENTS")) return true;
  return false;
}

export function isIncomeCategory(
  primary: string | null | undefined,
  categoryRow: { isIncome: boolean } | null,
): boolean {
  if (categoryRow?.isIncome) return true;
  const slug = bucketSlugForPlaid(primary, null);
  return slug === "income" || slug === "paychecks" || slug === "interest";
}
