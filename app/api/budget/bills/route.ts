import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import {
  createRecurringBill,
  getBillsDueInMonth,
  listRecurringBills,
} from "@/lib/recurring-bills";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (month) {
    const due = await getBillsDueInMonth(authResult.userId, month);
    return NextResponse.json({ bills: due });
  }

  const bills = await listRecurringBills(authResult.userId, true);
  return NextResponse.json({ bills });
}

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    name?: string;
    expectedAmount?: number;
    nextDueDate?: string;
    cadence?: string;
    merchantKey?: string | null;
    categoryId?: string | null;
  };

  if (!body.name?.trim() || body.expectedAmount == null || !body.nextDueDate) {
    return NextResponse.json(
      { error: "name, expectedAmount, and nextDueDate are required" },
      { status: 400 },
    );
  }

  const bill = await createRecurringBill(authResult.userId, {
    name: body.name,
    expectedAmount: Number(body.expectedAmount),
    nextDueDate: body.nextDueDate,
    cadence: body.cadence,
    merchantKey: body.merchantKey,
    categoryId: body.categoryId,
  });

  return NextResponse.json({ bill });
}
