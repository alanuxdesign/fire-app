import { parseBalance } from "@/lib/account-groups";
import { getMonthBounds } from "@/lib/budget-month";
import { recurringBills } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, asc, eq, gte, lte } from "drizzle-orm";

export type RecurringBillRow = {
  id: string;
  name: string;
  merchantKey: string | null;
  expectedAmount: number;
  cadence: string;
  nextDueDate: string;
  categoryId: string | null;
  isActive: boolean;
};

function serializeBill(row: typeof recurringBills.$inferSelect): RecurringBillRow {
  return {
    id: row.id,
    name: row.name,
    merchantKey: row.merchantKey,
    expectedAmount: parseBalance(row.expectedAmount),
    cadence: row.cadence,
    nextDueDate: row.nextDueDate,
    categoryId: row.categoryId,
    isActive: row.isActive,
  };
}

export async function listRecurringBills(
  userId: string,
  activeOnly = true,
): Promise<RecurringBillRow[]> {
  const rows = await db.query.recurringBills.findMany({
    where: eq(recurringBills.userId, userId),
    orderBy: [asc(recurringBills.nextDueDate)],
  });
  const filtered = activeOnly ? rows.filter((r) => r.isActive) : rows;
  return filtered.map(serializeBill);
}

export async function getBillsDueInMonth(
  userId: string,
  month: string,
): Promise<RecurringBillRow[]> {
  const { start, end } = getMonthBounds(month);
  const rows = await db.query.recurringBills.findMany({
    where: and(
      eq(recurringBills.userId, userId),
      eq(recurringBills.isActive, true),
      gte(recurringBills.nextDueDate, start),
      lte(recurringBills.nextDueDate, end),
    ),
  });
  return rows.map(serializeBill);
}

export async function getCommittedBillsTotal(
  userId: string,
  month: string,
): Promise<number> {
  const bills = await getBillsDueInMonth(userId, month);
  return bills.reduce((sum, b) => sum + b.expectedAmount, 0);
}

export async function createRecurringBill(
  userId: string,
  input: {
    name: string;
    expectedAmount: number;
    nextDueDate: string;
    cadence?: string;
    merchantKey?: string | null;
    categoryId?: string | null;
  },
): Promise<RecurringBillRow> {
  const [row] = await db
    .insert(recurringBills)
    .values({
      userId,
      name: input.name.trim(),
      expectedAmount: String(input.expectedAmount),
      nextDueDate: input.nextDueDate,
      cadence: input.cadence ?? "monthly",
      merchantKey: input.merchantKey ?? null,
      categoryId: input.categoryId ?? null,
    })
    .returning();
  return serializeBill(row);
}

export async function updateRecurringBill(
  userId: string,
  id: string,
  patch: Partial<{
    name: string;
    expectedAmount: number;
    nextDueDate: string;
    cadence: string;
    merchantKey: string | null;
    categoryId: string | null;
    isActive: boolean;
  }>,
): Promise<RecurringBillRow | null> {
  const existing = await db.query.recurringBills.findFirst({
    where: and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)),
  });
  if (!existing) return null;

  const [row] = await db
    .update(recurringBills)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.expectedAmount !== undefined
        ? { expectedAmount: String(patch.expectedAmount) }
        : {}),
      ...(patch.nextDueDate !== undefined
        ? { nextDueDate: patch.nextDueDate }
        : {}),
      ...(patch.cadence !== undefined ? { cadence: patch.cadence } : {}),
      ...(patch.merchantKey !== undefined
        ? { merchantKey: patch.merchantKey }
        : {}),
      ...(patch.categoryId !== undefined
        ? { categoryId: patch.categoryId }
        : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    })
    .where(eq(recurringBills.id, id))
    .returning();
  return serializeBill(row);
}

export async function deleteRecurringBill(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await db.query.recurringBills.findFirst({
    where: and(eq(recurringBills.id, id), eq(recurringBills.userId, userId)),
  });
  if (!existing) return false;
  await db.delete(recurringBills).where(eq(recurringBills.id, id));
  return true;
}
