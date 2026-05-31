import { requireUserId } from "@/lib/api-auth";
import { financialAccounts, plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const item = await db.query.plaidItems.findFirst({
      where: and(
        eq(plaidItems.id, id),
        eq(plaidItems.userId, authResult.userId),
      ),
    });

    if (!item) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    await db
      .delete(financialAccounts)
      .where(eq(financialAccounts.plaidItemId, id));

    await db.delete(plaidItems).where(eq(plaidItems.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to disconnect",
      },
      { status: 500 },
    );
  }
}
