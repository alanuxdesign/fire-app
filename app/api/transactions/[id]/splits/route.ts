import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import {
  getSplitsForTransaction,
  replaceTransactionSplits,
  validateSplitCategories,
} from "@/lib/transaction-splits";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const splits = await getSplitsForTransaction(authResult.userId, id);
  return NextResponse.json({ splits });
}

export async function PUT(request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    lines?: { categoryId: string; amount: number }[];
  };

  const lines = body.lines ?? [];
  try {
    await validateSplitCategories(
      authResult.userId,
      lines.map((l) => l.categoryId),
    );
    const splits = await replaceTransactionSplits(
      authResult.userId,
      id,
      lines,
    );
    return NextResponse.json({ splits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid splits";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  try {
    const splits = await replaceTransactionSplits(authResult.userId, id, []);
    return NextResponse.json({ splits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to clear splits";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
