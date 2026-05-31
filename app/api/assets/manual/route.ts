import { requireUserId } from "@/lib/api-auth";
import { isManualAssetType } from "@/lib/manual-assets";
import { manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { parseBalance } from "@/lib/account-groups";
import { parseCurrencyInput } from "@/lib/currency";
import { parsePurchaseDateInput, toDateString } from "@/lib/purchase-date";
import {
  refreshSnapshotsForManualAssets,
  upsertTodaySnapshot,
} from "@/lib/snapshots";
import { NextResponse } from "next/server";

type ManualAssetBody = {
  name?: string;
  assetType?: string;
  currentValue?: number | string;
  purchaseValue?: number | string | null;
  purchaseDate?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as ManualAssetBody;

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    if (!body.assetType || !isManualAssetType(body.assetType)) {
      return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
    }

    const parsedCurrent = parseCurrencyInput(body.currentValue);
    const parsedPurchase = parseCurrencyInput(body.purchaseValue ?? null);
    const currentNumeric = parsedCurrent ?? parsedPurchase;

    if (currentNumeric === null) {
      return NextResponse.json(
        { error: "Current value or purchase value is required" },
        { status: 400 },
      );
    }

    const currentValue = String(currentNumeric);
    const purchaseValue =
      parsedPurchase !== null ? String(parsedPurchase) : null;
    const address =
      body.assetType === "real_estate" ? body.address?.trim() || null : null;

    const purchaseDate = parsePurchaseDateInput(body.purchaseDate ?? null);
    if (body.purchaseDate?.trim() && !purchaseDate) {
      return NextResponse.json(
        { error: "Invalid purchase date. Use MM/DD/YYYY (e.g. 2/3/2022)." },
        { status: 400 },
      );
    }

    const [asset] = await db
      .insert(manualAssets)
      .values({
        userId: authResult.userId,
        name,
        assetType: body.assetType,
        currentValue,
        purchaseValue,
        purchaseDate,
        address,
        notes: body.notes?.trim() || null,
      })
      .returning();

    try {
      await upsertTodaySnapshot(authResult.userId);
      await refreshSnapshotsForManualAssets(authResult.userId, {
        fromDate: purchaseDate,
      });
    } catch (snapshotError) {
      console.error(
        "Failed to update snapshots after manual asset:",
        snapshotError,
      );
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        currentValue: parseBalance(asset.currentValue),
        purchaseValue: asset.purchaseValue
          ? parseBalance(asset.purchaseValue)
          : null,
        purchaseDate: toDateString(asset.purchaseDate),
        address: asset.address,
        notes: asset.notes,
        updatedAt: asset.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create manual asset",
      },
      { status: 500 },
    );
  }
}
