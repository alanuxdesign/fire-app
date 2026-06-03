import { requireWritableUser } from "@/lib/api-auth";
import {
  deleteRecurringBill,
  updateRecurringBill,
} from "@/lib/recurring-bills";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: string;
    expectedAmount?: number;
    nextDueDate?: string;
    cadence?: string;
    merchantKey?: string | null;
    categoryId?: string | null;
    isActive?: boolean;
  };

  const bill = await updateRecurringBill(authResult.userId, id, {
    ...body,
    ...(body.expectedAmount !== undefined
      ? { expectedAmount: Number(body.expectedAmount) }
      : {}),
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const ok = await deleteRecurringBill(authResult.userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
