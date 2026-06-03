import { parseBalance } from "@/lib/account-groups";
import { getMerchantKey } from "@/lib/merchant-key";
import { transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";

export type DuplicateGroup = {
  ids: string[];
  amount: number;
  merchantLabel: string;
  dates: string[];
  reason: "same_amount_date" | "transfer_pair";
};

function datesWithinOneDay(a: string, b: string): boolean {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(da - db) <= 86_400_000;
}

function merchantsSimilar(a: string, b: string): boolean {
  const ka = getMerchantKey(a, a);
  const kb = getMerchantKey(b, b);
  if (ka === kb) return true;
  return ka.includes(kb) || kb.includes(ka);
}

export async function findDuplicateCandidates(
  userId: string,
  limit = 50,
): Promise<DuplicateGroup[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      isNull(transactions.duplicateOfTransactionId),
      gte(transactions.date, sinceStr),
    ),
    limit: 500,
  });

  const eligible = rows.filter((r) => !r.isTransfer);
  const groups: DuplicateGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < eligible.length; i++) {
    const a = eligible[i];
    if (used.has(a.id)) continue;
    const amountA = parseBalance(a.amount);
    const labelA = a.merchantName ?? a.name;
    const cluster: typeof eligible = [a];

    for (let j = i + 1; j < eligible.length; j++) {
      const b = eligible[j];
      if (used.has(b.id)) continue;
      const amountB = parseBalance(b.amount);
      if (Math.abs(amountA - amountB) > 0.01) continue;
      if (!datesWithinOneDay(a.date, b.date)) continue;
      if (!merchantsSimilar(labelA, b.merchantName ?? b.name)) continue;
      cluster.push(b);
    }

    if (cluster.length < 2) continue;
    for (const t of cluster) used.add(t.id);
    groups.push({
      ids: cluster.map((t) => t.id),
      amount: amountA,
      merchantLabel: labelA,
      dates: [...new Set(cluster.map((t) => t.date))].sort(),
      reason: "same_amount_date",
    });
    if (groups.length >= limit) break;
  }

  return groups;
}
