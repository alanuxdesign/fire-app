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
  DEFAULT_INFLATION_RATE,
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
import { and, asc, desc, eq } from "drizzle-orm";
import {
  MAX_LIFESTYLE_PLANS,
  type LifePlanBundle,
  type LifePlanListItem,
  type LifePlanSnapshot,
  type SerializedContingencyPlan,
  type SerializedExpenseCategory,
  type SerializedLifePhase,
  type SerializedMilestoneEvent,
  type SerializedTierAssumptions,
} from "@/lib/life-plan-types";

export {
  MAX_LIFESTYLE_PLANS,
  type LifePlanBundle,
  type LifePlanListItem,
  type LifePlanSnapshot,
  type SerializedContingencyPlan,
  type SerializedExpenseCategory,
  type SerializedLifePhase,
  type SerializedMilestoneEvent,
  type SerializedTierAssumptions,
} from "@/lib/life-plan-types";

type PlanWithRelations = NonNullable<
  Awaited<ReturnType<typeof loadPlanById>>
>;

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
    budgetCategoryId: row.budgetCategoryId,
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
    budgetCategoryId: c.budgetCategoryId,
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
      inflationRate: DEFAULT_INFLATION_RATE,
      targetYear: new Date().getFullYear() + 15,
      partTimeIncome: DEFAULT_PART_TIME_INCOME,
    };
  }
  return {
    swr: parseNumericField(row.swr) || planSwr,
    expectedReturn: parseNumericField(row.expectedReturn) || DEFAULT_EXPECTED_RETURN,
    inflationRate: parseNumericField(row.inflationRate) || DEFAULT_INFLATION_RATE,
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

async function loadPlanById(userId: string, planId: string) {
  return db.query.lifePlans.findFirst({
    where: and(eq(lifePlans.id, planId), eq(lifePlans.userId, userId)),
    with: {
      phases: true,
      expenseCategories: true,
      tierAssumptions: true,
      milestoneEvents: true,
      contingencyPlans: true,
    },
  });
}

async function loadPrimaryPlan(userId: string) {
  const primary = await db.query.lifePlans.findFirst({
    where: and(eq(lifePlans.userId, userId), eq(lifePlans.isPrimary, true)),
    with: {
      phases: true,
      expenseCategories: true,
      tierAssumptions: true,
      milestoneEvents: true,
      contingencyPlans: true,
    },
  });
  if (primary) return primary;

  return db.query.lifePlans.findFirst({
    where: eq(lifePlans.userId, userId),
    orderBy: [asc(lifePlans.sortOrder), asc(lifePlans.createdAt)],
    with: {
      phases: true,
      expenseCategories: true,
      tierAssumptions: true,
      milestoneEvents: true,
      contingencyPlans: true,
    },
  });
}

function buildSnapshotFromPlan(
  plan: PlanWithRelations,
  assets: Awaited<ReturnType<typeof loadAssetTotals>>,
): LifePlanSnapshot {
  const planSwr = parseNumericField(plan.swr) || DEFAULT_SWR;
  const categories = [...plan.expenseCategories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeCategory);
  const tier = serializeTierAssumptions(plan.tierAssumptions ?? undefined, planSwr);

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
      zipCode: plan.zipCode,
      householdSize: plan.householdSize ?? 1,
      isPrimary: plan.isPrimary,
      sortOrder: plan.sortOrder,
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

export async function listLifePlanSummaries(
  userId: string,
  assetsOverride?: Awaited<ReturnType<typeof loadAssetTotals>>,
): Promise<LifePlanListItem[]> {
  const [plans, assets] = await Promise.all([
    db.query.lifePlans.findMany({
      where: eq(lifePlans.userId, userId),
      orderBy: [asc(lifePlans.sortOrder), asc(lifePlans.createdAt)],
      with: {
        expenseCategories: true,
        tierAssumptions: true,
        milestoneEvents: true,
      },
    }),
    assetsOverride ?? loadAssetTotals(userId),
  ]);

  return plans.map((plan) => {
    const planSwr = parseNumericField(plan.swr) || DEFAULT_SWR;
    const categories = [...plan.expenseCategories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeCategory);
    const tier = serializeTierAssumptions(plan.tierAssumptions ?? undefined, planSwr);
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
      id: plan.id,
      label: plan.label,
      isPrimary: plan.isPrimary,
      sortOrder: plan.sortOrder,
      annualLifeCost: derived.annualLifeCost,
      target: derived.target,
      progressPct: derived.progressPct,
    };
  });
}

export async function getLifePlanSnapshot(
  userId: string,
  planId?: string,
): Promise<LifePlanSnapshot | null> {
  const assets = await loadAssetTotals(userId);
  const plan = planId
    ? await loadPlanById(userId, planId)
    : await loadPrimaryPlan(userId);
  if (!plan) return null;
  return buildSnapshotFromPlan(plan, assets);
}

export async function getLifePlanBundle(
  userId: string,
  planId?: string,
): Promise<LifePlanBundle> {
  const assets = await loadAssetTotals(userId);
  const plans = await listLifePlanSummaries(userId, assets);
  const primaryPlanId = plans.find((p) => p.isPrimary)?.id ?? plans[0]?.id ?? null;
  const viewedPlanId = planId ?? primaryPlanId;
  const plan = viewedPlanId
    ? await loadPlanById(userId, viewedPlanId)
    : null;
  const snapshot = plan ? buildSnapshotFromPlan(plan, assets) : null;

  return {
    snapshot,
    plans,
    primaryPlanId,
    viewedPlanId,
  };
}

export type UpsertLifePlanInput = {
  label?: string;
  swr?: number;
  zipCode?: string | null;
  householdSize?: number;
  categories?: Array<{
    id?: string;
    label: string;
    annualAmount: number;
    isEssential: boolean;
    sortOrder: number;
    phaseId?: string | null;
    budgetCategoryId?: string | null;
  }>;
  phases?: Array<{ id?: string; label: string; sortOrder: number }>;
  tierAssumptions?: Partial<TierAssumptionInput>;
};

export async function upsertLifePlan(
  userId: string,
  input: UpsertLifePlanInput,
  options?: { planId?: string },
): Promise<LifePlanSnapshot> {
  const existing = options?.planId
    ? await db.query.lifePlans.findFirst({
        where: and(
          eq(lifePlans.id, options.planId),
          eq(lifePlans.userId, userId),
        ),
      })
    : await db.query.lifePlans.findFirst({
        where: and(eq(lifePlans.userId, userId), eq(lifePlans.isPrimary, true)),
      }) ??
      (await db.query.lifePlans.findFirst({
        where: eq(lifePlans.userId, userId),
        orderBy: [asc(lifePlans.sortOrder), asc(lifePlans.createdAt)],
      }));

  let planId = existing?.id;

  if (!existing) {
    const [created] = await db
      .insert(lifePlans)
      .values({
        userId,
        label: input.label?.trim() || "My life",
        swr: String(input.swr ?? DEFAULT_SWR),
        zipCode: input.zipCode?.trim() || null,
        householdSize: input.householdSize ?? 1,
        isPrimary: true,
        sortOrder: 0,
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
        budgetCategoryId: c.budgetCategoryId ?? null,
      }),
    );
    if (categoryRows.length > 0) {
      await db.insert(lifeExpenseCategories).values(categoryRows);
    }
  } else {
    const planUpdates: Partial<typeof lifePlans.$inferInsert> = {};
    if (input.label?.trim()) planUpdates.label = input.label.trim();
    if (input.swr != null) planUpdates.swr = String(input.swr);
    if (input.zipCode !== undefined) {
      planUpdates.zipCode = input.zipCode?.trim() || null;
    }
    if (input.householdSize != null) {
      planUpdates.householdSize = input.householdSize;
    }
    if (Object.keys(planUpdates).length > 0) {
      await db
        .update(lifePlans)
        .set(planUpdates)
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
          budgetCategoryId: c.budgetCategoryId ?? null,
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
        inflationRate: String(tier.inflationRate ?? DEFAULT_INFLATION_RATE),
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
          ...(tier.inflationRate != null
            ? { inflationRate: String(tier.inflationRate) }
            : {}),
          ...(tier.targetYear !== undefined ? { targetYear: tier.targetYear } : {}),
          ...(tier.partTimeIncome != null
            ? { partTimeIncome: String(tier.partTimeIncome) }
            : {}),
        },
      });
  }

  const snapshot = await getLifePlanSnapshot(userId, planId);
  if (!snapshot) {
    throw new Error("Life plan not found after save");
  }
  return snapshot;
}

export async function createLifePlanScenario(
  userId: string,
  input: { label: string; cloneFromPlanId?: string },
): Promise<LifePlanSnapshot> {
  const count = await db.query.lifePlans.findMany({
    where: eq(lifePlans.userId, userId),
    columns: { id: true },
  });
  if (count.length >= MAX_LIFESTYLE_PLANS) {
    throw new Error(`You can compare up to ${MAX_LIFESTYLE_PLANS} lifestyles at once`);
  }

  const sourceId =
    input.cloneFromPlanId ??
    (
      await db.query.lifePlans.findFirst({
        where: and(eq(lifePlans.userId, userId), eq(lifePlans.isPrimary, true)),
        columns: { id: true },
      })
    )?.id;

  const source = sourceId
    ? await loadPlanById(userId, sourceId)
    : null;

  const maxSort = await db.query.lifePlans.findFirst({
    where: eq(lifePlans.userId, userId),
    orderBy: [desc(lifePlans.sortOrder)],
    columns: { sortOrder: true },
  });

  const [created] = await db
    .insert(lifePlans)
    .values({
      userId,
      label: input.label.trim() || "Another life",
      swr: source ? source.swr : String(DEFAULT_SWR),
      zipCode: source?.zipCode ?? null,
      householdSize: source?.householdSize ?? 1,
      isPrimary: false,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    })
    .returning();

  if (source?.tierAssumptions) {
    const t = source.tierAssumptions;
    await db.insert(tierAssumptions).values({
      lifePlanId: created.id,
      swr: t.swr,
      expectedReturn: t.expectedReturn,
      inflationRate: t.inflationRate,
      targetYear: t.targetYear,
      partTimeIncome: t.partTimeIncome,
    });
  } else {
    await db.insert(tierAssumptions).values({ lifePlanId: created.id });
  }

  if (source?.expenseCategories.length) {
    await db.insert(lifeExpenseCategories).values(
      [...source.expenseCategories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c, index) => ({
          lifePlanId: created.id,
          label: c.label,
          annualAmount: c.annualAmount,
          isEssential: c.isEssential,
          sortOrder: index,
          budgetCategoryId: c.budgetCategoryId ?? null,
          phaseId: null,
        })),
    );
  } else {
    await db.insert(lifeExpenseCategories).values(
      DEFAULT_LIFE_EXPENSE_CATEGORIES.map((c, index) => ({
        lifePlanId: created.id,
        label: c.label,
        annualAmount: String(c.annualAmount),
        isEssential: c.isEssential,
        sortOrder: index,
        budgetCategoryId: c.budgetCategoryId ?? null,
      })),
    );
  }

  if (source?.phases.length) {
    await db.insert(lifePhases).values(
      [...source.phases]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p, index) => ({
          lifePlanId: created.id,
          label: p.label,
          sortOrder: index,
        })),
    );
  }

  const snapshot = await getLifePlanSnapshot(userId, created.id);
  if (!snapshot) {
    throw new Error("Failed to create lifestyle scenario");
  }
  return snapshot;
}

export async function setPrimaryLifePlan(
  userId: string,
  planId: string,
): Promise<LifePlanSnapshot> {
  const target = await db.query.lifePlans.findFirst({
    where: and(eq(lifePlans.id, planId), eq(lifePlans.userId, userId)),
  });
  if (!target) {
    throw new Error("Life plan not found");
  }

  await db
    .update(lifePlans)
    .set({ isPrimary: false })
    .where(eq(lifePlans.userId, userId));
  await db
    .update(lifePlans)
    .set({ isPrimary: true })
    .where(eq(lifePlans.id, planId));

  const snapshot = await getLifePlanSnapshot(userId, planId);
  if (!snapshot) {
    throw new Error("Life plan not found after update");
  }
  return snapshot;
}

export async function upsertContingencyPlan(
  userId: string,
  scenario: "job_loss" | "big_expense" | "downturn",
  levers: Record<string, unknown>,
  planId?: string,
) {
  const plan = planId
    ? await db.query.lifePlans.findFirst({
        where: and(eq(lifePlans.id, planId), eq(lifePlans.userId, userId)),
      })
    : await loadPrimaryPlan(userId);
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

export async function recordMilestoneCrossings(userId: string, planId?: string) {
  const snapshot = await getLifePlanSnapshot(userId, planId);
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

/** Delete one lifestyle or all plans when planId is omitted. */
export async function deleteLifePlan(
  userId: string,
  planId?: string,
): Promise<boolean> {
  if (!planId) {
    const deleted = await db
      .delete(lifePlans)
      .where(eq(lifePlans.userId, userId))
      .returning({ id: lifePlans.id });
    return deleted.length > 0;
  }

  const target = await db.query.lifePlans.findFirst({
    where: and(eq(lifePlans.id, planId), eq(lifePlans.userId, userId)),
  });
  if (!target) return false;

  const all = await db.query.lifePlans.findMany({
    where: eq(lifePlans.userId, userId),
    orderBy: [asc(lifePlans.sortOrder), asc(lifePlans.createdAt)],
  });

  if (all.length === 1) {
    const deleted = await db
      .delete(lifePlans)
      .where(eq(lifePlans.id, planId))
      .returning({ id: lifePlans.id });
    return deleted.length > 0;
  }

  if (target.isPrimary) {
    const nextPrimary = all.find((p) => p.id !== planId);
    if (nextPrimary) {
      await db
        .update(lifePlans)
        .set({ isPrimary: true })
        .where(eq(lifePlans.id, nextPrimary.id));
    }
  }

  const deleted = await db
    .delete(lifePlans)
    .where(eq(lifePlans.id, planId))
    .returning({ id: lifePlans.id });
  return deleted.length > 0;
}
