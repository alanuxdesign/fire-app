import { requireUserId } from "@/lib/api-auth";
import { parseBalance } from "@/lib/account-groups";
import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  ASSET_CLASS_OPTIONS,
  type AssetClassLabel,
} from "@/lib/portfolio-views";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

type PatchBody = {
  assetClassOverride?: string | null;
  marketSymbol?: string | null;
  marketQuantity?: number | string | null;
  name?: string;
};

function isValidAssetClass(value: string): value is AssetClassLabel {
  return ASSET_CLASS_OPTIONS.includes(value as AssetClassLabel);
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as PatchBody;

    const financial = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, authResult.userId),
      ),
    });

    if (financial) {
      if (
        body.assetClassOverride !== undefined &&
        body.assetClassOverride !== null &&
        !isValidAssetClass(body.assetClassOverride)
      ) {
        return NextResponse.json(
          { error: "Invalid asset class" },
          { status: 400 },
        );
      }

      const [updated] = await db
        .update(financialAccounts)
        .set({
          ...(body.assetClassOverride !== undefined
            ? { assetClass: body.assetClassOverride ?? null }
            : {}),
          ...(body.name?.trim() ? { name: body.name.trim() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(financialAccounts.id, id))
        .returning();

      return NextResponse.json({ account: updated });
    }

    const manual = await db.query.manualAssets.findFirst({
      where: and(
        eq(manualAssets.id, id),
        eq(manualAssets.userId, authResult.userId),
      ),
    });

    if (!manual) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (
      body.assetClassOverride !== undefined &&
      body.assetClassOverride !== null &&
      !isValidAssetClass(body.assetClassOverride)
    ) {
      return NextResponse.json({ error: "Invalid asset class" }, { status: 400 });
    }

    const quantity =
      body.marketQuantity === null || body.marketQuantity === undefined
        ? undefined
        : Number(body.marketQuantity);

    const [updated] = await db
      .update(manualAssets)
      .set({
        ...(body.assetClassOverride !== undefined
          ? { assetClassOverride: body.assetClassOverride }
          : {}),
        ...(body.marketSymbol !== undefined
          ? { marketSymbol: body.marketSymbol?.trim().toUpperCase() || null }
          : {}),
        ...(quantity !== undefined && Number.isFinite(quantity)
          ? { marketQuantity: String(quantity) }
          : body.marketQuantity === null
            ? { marketQuantity: null }
            : {}),
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(manualAssets.id, id))
      .returning();

    return NextResponse.json({
      account: {
        ...updated,
        currentValue: parseBalance(updated.currentValue),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update account",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const financial = await db.query.financialAccounts.findFirst({
      where: and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, authResult.userId),
      ),
    });

    if (financial) {
      await db
        .delete(financialAccounts)
        .where(eq(financialAccounts.id, id));
      return NextResponse.json({ success: true });
    }

    const manual = await db.query.manualAssets.findFirst({
      where: and(
        eq(manualAssets.id, id),
        eq(manualAssets.userId, authResult.userId),
      ),
    });

    if (!manual) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await db.delete(manualAssets).where(eq(manualAssets.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete account",
      },
      { status: 500 },
    );
  }
}
