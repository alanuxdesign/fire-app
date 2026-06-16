import {
  buildAccountsResponse,
  type FinancialAccountRow,
  type ManualAssetRow,
} from "@/lib/account-groups";
import {
  parseAccessibilityValue,
  parseNumericField,
  sumLifePlanAssets,
} from "@/lib/life-plan-assets";
import { DEFAULT_LIFE_EXPENSE_CATEGORIES } from "@/lib/life-plan-defaults";
import {
  computeLifePlanDerived,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_PART_TIME_INCOME,
  DEFAULT_SWR,
  type LifeExpenseCategoryInput,
  type LifePlanDerived,
  type TierAssumptionInput,
} from "@/lib/life-plan";
import {
  contingencyPlans,
  financialAccounts,
  lifeExpenseCategories,
  lifePhases,
  lifePlans,
  manualAssets,
  milestoneEvents,
  tierAssumptions,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getPlaidInstitutionsForUser } from "@/lib/plaid-accounts";
import { eq } from "drizzle-orm";

export type SerializedLifePhase = {
  id: string;
  label: string;
  sortOrder: number;
};

export type SerializedExpenseCategory = {
  id: string;
  label: string;
  annualAmount: number;
  isEssential: boolean;
  phaseId: string | null;
  sortOrder: number;
};

export type SerializedTierAssumptions = TierAssumptionInput;

export type SerializedMilestoneEvent = {
  id: string;
  type: "category" | "tier";
  ref: string;
  securedAt: string;
  bufferClearAt: string | null;
};

export type SerializedContingencyPlan = {
  id: string;
  scenario: "job_loss" | "big_expense" | "downturn";
  levers: Record<string, unknown>;
  savedAt: string;
};

export type LifePlanSnapshot = {
  plan: {
    id: string;
    label: string;
    swr: number;
    createdAt: string;
    phases: SerializedLifePhase[];
    categories: SerializedExpenseCategory[];
    tierAssumptions: SerializedTierAssumptions;
    milestoneEvents: SerializedMilestoneEvent[];
    contingencyPlans: SerializedContingencyPlan[];
  };
  assets: {
    totalInvestedLiquid: number;
    totalAccessible: number;
  };
  derived: LifePlanDerived;
};

function serializeCategory(
  row: typeof lifeExpenseCategories.$inferSelect,
): SerializedExpenseCategory {
  return {
    id: row.id,
    label: row.label,
    annualAmount: parseNumericField(row.annualAmount),
    isEssential: row.isEssential,
    phaseId: row.phaseId,
    sortOrder: row.sortOrder,
  };
}

function toCategoryInputs(
  categories: SerializedExpenseCategory[],
): LifeExpenseCategoryInput[] {
  return categories.map((c) => ({
    id: c.id,
    label: c.label,
    annualAmount: c.annualAmount,
    isEssential: c.isEssential,
    sortOrder: c.sortOrder,
  }));
}

function serializeTierAssumptions(
  row: typeof tierAssumptions.$inferSelect | undefined,
  planSwr: number,
): SerializedTierAssumptions {
  if (!row) {
    return {
      swr: planSwr,
      expectedReturn: DEFAULT_EXPECTED_RETURN,
      targetYear: new Date().getFullYear() + 15,
      partTimeIncome: DEFAULT_PART_TIME_INCOME,
    };
  }
  return {
    swr: parseNumericField(row.swr) || planSwr,
    expectedReturn: parseNumericField(row.expectedReturn) || DEFAULT_EXPECTED_RETURN,
    targetYear: row.targetYear,
    partTimeIncome:
      parseNumericField(row.partTimeIncome) || DEFAULT_PART_TIME_INCOME,
  };
}

async function loadAccessibilityOverrides(userId: string) {
  const [financialRows, manualRows] = await Promise.all([
    db.query.financialAccounts.findMany({
      where: eq(financialAccounts.userId, userId),
      columns: { id: true, accessibility: true },
    }),
    db.query.manualAssets.findMany({
      where: eq(manualAssets.userId, userId),
      columns: { id: true, accessibility: true },
    }),
  ]);

  const map = new Map<string, ReturnType<typeof parseAccessibilityValue>>();
  for (const row of financialRows) {
    map.set(row.id, parseAccessibilityValue(row.accessibility));
  }
  for (const row of manualRows) {
    map.set(row.id, parseAccessibilityValue(row.accessibility));
  }
  return map;
}

async function loadAssetTotals(userId: string) {
  const [financialRows, manualRows, institutions, accessibilityOverrides] =
    await Promise.all([
      db.query.financialAccounts.findMany({
        where: eq(financialAccounts.userId, userId),
      }),
      db.query.manualAssets.findMany({
        where: eq(manualAssets.userId, userId),
      }),
      getPlaidInstitutionsForUser(userId),
      loadAccessibilityOverrides(userId),
    ]);

  const accountsResponse = buildAccountsResponse(
    financialRows as FinancialAccountRow[],
    manualRows as ManualAssetRow[],
    institutions,
  );

  const allAccounts = accountsResponse.groups.flatMap((g) => g.accounts);
  return sumLifePlanAssets(allAccounts, accessibilityOverrides);
}

export async function getLifePlanSnapshot(
  userId: string,
): Promise<LifePlanSnapshot | null> {
  const plan = await db.query.lifePlans.findFirst({
    where: eq(lifePlans.userId, userId),
    with: {
      phases: true,
      expenseCategories: true,
      tierAssumptions: true,
      milestoneEvents: true,
      contingencyPlans: true,
    },
  });

  if (!plan) return null;

  const planSwr = parseNumericField(plan.swr) || DEFAULT_SWR;
  const categories = [...plan.expenseCategories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeCategory);
  const tier = serializeTierAssumptions(plan.tierAssumptions ?? undefined, planSwr);
  const assets = await loadAssetTotals(userId);

  const securedCategoryIds = new Set(
    plan.milestoneEvents
      .filter((e) => e.type === "category")
      .map((e) => e.ref),
  );

  const derived = computeLifePlanDerived({
    categories: toCategoryInputs(categories),
    assets: assets.totalInvestedLiquid,
    accessibleAssets: assets.totalAccessible,
    swr: tier.swr,
    assumptions: tier,
    previouslySecuredCategoryIds: securedCategoryIds,
  });

  return {
    plan: {
      id: plan.id,
      label: plan.label,
      swr: planSwr,
      createdAt: plan.createdAt.toISOString(),
      phases: plan.phases
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({
          id: p.id,
          label: p.label,
          sortOrder: p.sortOrder,
        })),
      categories,
      tierAssumptions: tier,
      milestoneEvents: plan.milestoneEvents.map((e) => ({
        id: e.id,
        type: e.type,
        ref: e.ref,
        securedAt: e.securedAt.toISOString(),
        bufferClearAt: e.bufferClearAt?.toISOString() ?? null,
      })),
      contingencyPlans: plan.contingencyPlans.map((c) => ({
        id: c.id,
        scenario: c.scenario,
        levers: c.levers ?? {},
        savedAt: c.savedAt.toISOString(),
      })),
    },
    assets,
    derived,
  };
}

export type UpsertLifePlanInput = {
  label?: string;
  swr?: number;
  categories?: Array<{
    id?: string;
    label: string;
    annualAmount: number;
    isEssential: boolean;
    sortOrder: number;
    phaseId?: string | null;
  }>;
  phases?: Array<{ id?: string; label: string; sortOrder: number }>;
  tierAssumptions?: Partial<TierAssumptionInput>;
};

export async function upsertLifePlan(
  userId: string,
  input: UpsertLifePlanInput,
): Promise<LifePlanSnapshot> {
  const existing = await db.query.lifePlans.findFirst({
    where: eq(lifePlans.userId, userId),
  });

  let planId = existing?.id;

  if (!existing) {
    const [created] = await db
      .insert(lifePlans)
      .values({
        userId,
        label: input.label?.trim() || "My life",
        swr: String(input.swr ?? DEFAULT_SWR),
      })
      .returning();
    planId = created.id;

    await db.insert(tierAssumptions).values({
      lifePlanId: created.id,
    });

    const categoryRows = (input.categories ?? DEFAULT_LIFE_EXPENSE_CATEGORIES).map(
      (c, index) => ({
        lifePlanId: created.id,
        label: c.label,
        annualAmount: String(c.annualAmount),
        isEssential: c.isEssential,
        sortOrder: c.sortOrder ?? index,
      }),
    );
    if (categoryRows.length > 0) {
      await db.insert(lifeExpenseCategories).values(categoryRows);
    }
  } else {
    if (input.label?.trim()) {
      await db
        .update(lifePlans)
        .set({
          label: input.label.trim(),
          ...(input.swr != null ? { swr: String(input.swr) } : {}),
        })
        .where(eq(lifePlans.id, existing.id));
    } else if (input.swr != null) {
      await db
        .update(lifePlans)
        .set({ swr: String(input.swr) })
        .where(eq(lifePlans.id, existing.id));
    }
    planId = existing.id;
  }

  if (!planId) {
    throw new Error("Failed to resolve life plan");
  }

  if (input.phases) {
    await db.delete(lifePhases).where(eq(lifePhases.lifePlanId, planId));
    if (input.phases.length > 0) {
      await db.insert(lifePhases).values(
        input.phases.map((p, index) => ({
          lifePlanId: planId!,
          label: p.label,
          sortOrder: p.sortOrder ?? index,
        })),
      );
    }
  }

  if (input.categories && existing) {
    await db
      .delete(lifeExpenseCategories)
      .where(eq(lifeExpenseCategories.lifePlanId, planId));
    if (input.categories.length > 0) {
      await db.insert(lifeExpenseCategories).values(
        input.categories.map((c, index) => ({
          lifePlanId: planId!,
          label: c.label,
          annualAmount: String(c.annualAmount),
          isEssential: c.isEssential,
          sortOrder: c.sortOrder ?? index,
          phaseId: c.phaseId ?? null,
        })),
      );
    }
  }

  if (input.tierAssumptions) {
    const tier = input.tierAssumptions;
    await db
      .insert(tierAssumptions)
      .values({
        lifePlanId: planId,
        swr: String(tier.swr ?? DEFAULT_SWR),
        expectedReturn: String(tier.expectedReturn ?? DEFAULT_EXPECTED_RETURN),
        targetYear: tier.targetYear ?? null,
        partTimeIncome: String(tier.partTimeIncome ?? DEFAULT_PART_TIME_INCOME),
      })
      .onConflictDoUpdate({
        target: tierAssumptions.lifePlanId,
        set: {
          ...(tier.swr != null ? { swr: String(tier.swr) } : {}),
          ...(tier.expectedReturn != null
            ? { expectedReturn: String(tier.expectedReturn) }
            : {}),
          ...(tier.targetYear !== undefined ? { targetYear: tier.targetYear } : {}),
          ...(tier.partTimeIncome != null
            ? { partTimeIncome: String(tier.partTimeIncome) }
            : {}),
        },
      });
  }

  const snapshot = await getLifePlanSnapshot(userId);
  if (!snapshot) {
    throw new Error("Life plan not found after save");
  }
  return snapshot;
}

export async function upsertContingencyPlan(
  userId: string,
  scenario: "job_loss" | "big_expense" | "downturn",
  levers: Record<string, unknown>,
) {
  const plan = await db.query.lifePlans.findFirst({
    where: eq(lifePlans.userId, userId),
  });
  if (!plan) {
    throw new Error("Create a life plan first");
  }

  await db
    .insert(contingencyPlans)
    .values({
      lifePlanId: plan.id,
      scenario,
      levers,
    })
    .onConflictDoUpdate({
      target: [contingencyPlans.lifePlanId, contingencyPlans.scenario],
      set: {
        levers,
        savedAt: new Date(),
      },
    });
}

export async function recordMilestoneCrossings(userId: string) {
  const snapshot = await getLifePlanSnapshot(userId);
  if (!snapshot) return;

  const { plan, derived } = snapshot;
  const now = new Date();

  for (const row of derived.categoryCoverage) {
    if (!row.id || !row.secured) continue;
    const already = plan.milestoneEvents.some(
      (e) => e.type === "category" && e.ref === row.id,
    );
    if (already) continue;
    await db.insert(milestoneEvents).values({
      lifePlanId: plan.id,
      type: "category",
      ref: row.id,
    });
  }

  for (const tier of derived.tiers) {
    if (!tier.met) continue;
    const already = plan.milestoneEvents.some(
      (e) => e.type === "tier" && e.ref === tier.tier,
    );
    if (already) continue;
    await db.insert(milestoneEvents).values({
      lifePlanId: plan.id,
      type: "tier",
      ref: tier.tier,
      securedAt: now,
    });
  }
}
