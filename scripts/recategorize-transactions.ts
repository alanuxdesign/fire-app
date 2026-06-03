import { loadEnvLocal, requireDatabaseUrl } from "./load-env";

loadEnvLocal();
requireDatabaseUrl();

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const userId = args.find((a) => !a.startsWith("--"));

  if (!userId) {
    console.error(
      "Usage: npm run recategorize -- <userId> [--force]\n\n" +
        "  --force  Re-apply categories from Plaid labels for ALL transactions\n" +
        "           (default: only uncategorized rows)",
    );
    process.exit(1);
  }

  const {
    clearSystemCategoriesCache,
    ensureSystemBudgetCategories,
    isTransferCategory,
    resolveCategoryIdForPlaid,
  } = await import("@/lib/budget-categories");
  const { transactions } = await import("@/drizzle/schema");
  const { db } = await import("@/lib/db");
  const { and, eq, isNull } = await import("drizzle-orm");

  clearSystemCategoriesCache();
  await ensureSystemBudgetCategories();

  const rows = await db.query.transactions.findMany({
    where: force
      ? eq(transactions.userId, userId)
      : and(
          eq(transactions.userId, userId),
          isNull(transactions.userCategoryId),
        ),
  });

  let updated = 0;

  for (const row of rows) {
    const categoryId = isTransferCategory(
      row.primaryCategory,
      row.detailedCategory,
    )
      ? await resolveCategoryIdForPlaid("TRANSFER_OUT", null)
      : await resolveCategoryIdForPlaid(
          row.primaryCategory,
          row.detailedCategory,
        );

    if (!categoryId) continue;

    await db
      .update(transactions)
      .set({
        userCategoryId: categoryId,
        reviewStatus:
          row.reviewStatus === "pending" ? null : row.reviewStatus,
        reviewedAt: row.reviewStatus === "pending" ? null : row.reviewedAt,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id));

    updated += 1;
  }

  const uncategorized = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      isNull(transactions.userCategoryId),
    ),
  });

  const mode = force ? "force (all transactions)" : "uncategorized only";
  console.log(
    `Recategorized ${updated} transactions [${mode}]. ${uncategorized.length} still uncategorized.`,
  );

  if (!force && uncategorized.length > 0) {
    console.log(
      "Tip: run with --force to overwrite existing bucket assignments from Plaid labels.",
    );
  }

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
