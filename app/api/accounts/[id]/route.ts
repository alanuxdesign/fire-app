import { requireWritableUser } from "@/lib/api-auth";
import { parseBalance } from "@/lib/account-groups";
import { parseCurrencyInput } from "@/lib/currency";
import { parsePurchaseDateInput, toDateString } from "@/lib/purchase-date";
import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  refreshSnapshotsForManualAssets,
  upsertTodaySnapshot,
} from "@/lib/snapshots";
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
  currentValue?: number | string | null;
  purchaseValue?: number | string | null;
  purchaseDate?: string | null;
};

function isValidAssetClass(value: string): value is AssetClassLabel {
  return ASSET_CLASS_OPTIONS.includes(value as AssetClassLabel);
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
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
        .where(
          and(
            eq(financialAccounts.id, id),
            eq(financialAccounts.userId, authResult.userId),
          ),
        )
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

    const parsedCurrent =
      body.currentValue !== undefined
        ? parseCurrencyInput(body.currentValue)
        : undefined;
    const parsedPurchase =
      body.purchaseValue !== undefined
        ? parseCurrencyInput(body.purchaseValue)
        : undefined;

    if (
      body.purchaseValue !== undefined &&
      body.purchaseValue !== null &&
      String(body.purchaseValue).trim() !== "" &&
      parsedPurchase === null
    ) {
      return NextResponse.json(
        { error: "Invalid purchase price" },
        { status: 400 },
      );
    }

    let purchaseDate: string | null | undefined;
    if (body.purchaseDate !== undefined) {
      if (body.purchaseDate === null || body.purchaseDate === "") {
        purchaseDate = null;
      } else {
        const parsed = parsePurchaseDateInput(body.purchaseDate);
        if (!parsed) {
          return NextResponse.json(
            {
              error: "Invalid purchase date. Use MM/DD/YYYY (e.g. 2/3/2022).",
            },
            { status: 400 },
          );
        }
        purchaseDate = parsed;
      }
    }

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
        ...(parsedCurrent !== undefined && parsedCurrent !== null
          ? { currentValue: String(parsedCurrent) }
          : {}),
        ...(parsedPurchase !== undefined
          ? {
              purchaseValue:
                parsedPurchase !== null ? String(parsedPurchase) : null,
            }
          : {}),
        ...(purchaseDate !== undefined ? { purchaseDate } : {}),
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(manualAssets.id, id),
          eq(manualAssets.userId, authResult.userId),
        ),
      )
      .returning();

    const refreshFromDate = toDateString(
      purchaseDate !== undefined
        ? purchaseDate
        : (updated.purchaseDate ?? manual.purchaseDate),
    );

    try {
      await upsertTodaySnapshot(authResult.userId);
      await refreshSnapshotsForManualAssets(authResult.userId, {
        fromDate: refreshFromDate,
      });
    } catch (snapshotError) {
      console.error(
        "Failed to refresh snapshots after manual asset update:",
        snapshotError,
      );
    }

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
  const authResult = await requireWritableUser();
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
        .where(
          and(
            eq(financialAccounts.id, id),
            eq(financialAccounts.userId, authResult.userId),
          ),
        );
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

    await db.delete(manualAssets).where(
      and(
        eq(manualAssets.id, id),
        eq(manualAssets.userId, authResult.userId),
      ),
    );
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
