import { requireWritableUser } from "@/lib/api-auth";
import {
  applyMerchantRuleRetroactive,
  upsertMerchantRule,
} from "@/lib/merchant-rules";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    merchantKey?: string;
    displayName?: string | null;
    defaultCategoryId?: string | null;
    defaultTagIds?: string[];
    requiresReview?: boolean;
    applyToFuture?: boolean;
    applyRetroactive?: boolean;
    categoryId?: string | null;
  };

  if (!body.merchantKey) {
    return NextResponse.json(
      { error: "merchantKey is required" },
      { status: 400 },
    );
  }

  const categoryId = body.defaultCategoryId ?? body.categoryId ?? null;

  const rule = await upsertMerchantRule({
    userId: authResult.userId,
    merchantKey: body.merchantKey,
    displayName: body.displayName,
    defaultCategoryId: categoryId,
    defaultTagIds: body.defaultTagIds,
    requiresReview: body.requiresReview,
    applyToFuture: body.applyToFuture ?? Boolean(categoryId),
  });

  let retroactiveUpdated = 0;
  if (body.applyRetroactive && categoryId) {
    retroactiveUpdated = await applyMerchantRuleRetroactive({
      userId: authResult.userId,
      merchantKey: body.merchantKey,
      categoryId,
      markReviewed: !body.requiresReview,
    });
  }

  return NextResponse.json({ rule, retroactiveUpdated });
}
