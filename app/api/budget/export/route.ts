import { requireUserId } from "@/lib/api-auth";
import { getCurrentBudgetMonth, getMonthBounds } from "@/lib/budget-month";
import { getExcludedBudgetAccountIds } from "@/lib/budget-rollups";
import { listBudgetCategoriesForUser } from "@/lib/budget-categories";
import { serializeTransaction } from "@/lib/plaid-transactions";
import { transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const month = searchParams.get("month");

  let start: string;
  let end: string;
  if (month) {
    const bounds = getMonthBounds(month);
    start = bounds.start;
    end = bounds.end;
  } else if (from && to) {
    start = from;
    end = to;
  } else {
    const bounds = getMonthBounds(getCurrentBudgetMonth());
    start = bounds.start;
    end = bounds.end;
  }

  const excluded = await getExcludedBudgetAccountIds(authResult.userId);
  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, authResult.userId),
      gte(transactions.date, start),
      lte(transactions.date, end),
    ),
    orderBy: [desc(transactions.date)],
    limit: 5000,
  });

  const filtered = rows.filter((r) => !excluded.has(r.financialAccountId));
  const categories = await listBudgetCategoriesForUser(authResult.userId);
  const categoryById = new Map(categories.map((c) => [c.id, c.label]));

  const header = [
    "date",
    "amount",
    "name",
    "merchant",
    "category",
    "pending",
    "include_in_budget",
    "note",
  ].join(",");

  const lines = filtered.map((row) => {
    const s = serializeTransaction(row);
    const cat = row.userCategoryId
      ? categoryById.get(row.userCategoryId) ?? ""
      : "";
    return [
      s.date,
      String(s.amount),
      csvEscape(s.name),
      csvEscape(s.merchantName ?? ""),
      csvEscape(cat),
      s.pending ? "yes" : "no",
      s.includeInBudget ? "yes" : "no",
      csvEscape(s.note ?? ""),
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `transactions-${start}-to-${end}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
