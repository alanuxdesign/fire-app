import { requireUserId } from "@/lib/api-auth";
import { isManualAssetType } from "@/lib/manual-assets";
import { manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { parseBalance } from "@/lib/account-groups";
import { createSnapshotIfNeeded } from "@/lib/snapshots";
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

function parseOptionalCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return String(numeric);
}

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

    const currentValue = parseOptionalCurrency(body.currentValue);
    if (currentValue === null) {
      return NextResponse.json(
        { error: "Current value is required" },
        { status: 400 },
      );
    }

    const purchaseValue = parseOptionalCurrency(body.purchaseValue ?? null);
    const address =
      body.assetType === "real_estate" ? body.address?.trim() || null : null;

    let purchaseDate: string | null = null;
    if (body.purchaseDate) {
      const parsed = new Date(body.purchaseDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid purchase date" },
          { status: 400 },
        );
      }
      purchaseDate = body.purchaseDate;
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
      await createSnapshotIfNeeded(authResult.userId);
    } catch (snapshotError) {
      console.error(
        "Failed to create balance snapshot after manual asset:",
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
        purchaseDate: asset.purchaseDate,
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
