import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import {
  getLifePlanSnapshot,
  recordMilestoneCrossings,
  upsertContingencyPlan,
  upsertLifePlan,
  type UpsertLifePlanInput,
} from "@/lib/life-plan-service";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const snapshot = await getLifePlanSnapshot(authResult.userId);
    if (snapshot) {
      await recordMilestoneCrossings(authResult.userId);
      const refreshed = await getLifePlanSnapshot(authResult.userId);
      return NextResponse.json({ snapshot: refreshed });
    }
    return NextResponse.json({ snapshot: null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load life plan",
      },
      { status: 500 },
    );
  }
}

type LifePlanBody = UpsertLifePlanInput & {
  contingency?: {
    scenario: "job_loss" | "big_expense" | "downturn";
    levers: Record<string, unknown>;
  };
};

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as LifePlanBody;
    const { contingency, ...planInput } = body;

    const snapshot = await upsertLifePlan(authResult.userId, planInput);

    if (contingency) {
      await upsertContingencyPlan(
        authResult.userId,
        contingency.scenario,
        contingency.levers,
      );
    }

    await recordMilestoneCrossings(authResult.userId);
    const refreshed = await getLifePlanSnapshot(authResult.userId);

    return NextResponse.json({ snapshot: refreshed ?? snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save life plan",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
