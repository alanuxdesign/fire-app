import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import {
  createLifePlanScenario,
  deleteLifePlan,
  getLifePlanBundle,
  getLifePlanSnapshot,
  recordMilestoneCrossings,
  setPrimaryLifePlan,
  upsertContingencyPlan,
  upsertLifePlan,
  type UpsertLifePlanInput,
} from "@/lib/life-plan-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId") ?? undefined;

  try {
    const bundle = await getLifePlanBundle(authResult.userId, planId);
    if (bundle.snapshot) {
      const milestonePlanId = planId ?? bundle.primaryPlanId ?? undefined;
      await recordMilestoneCrossings(authResult.userId, milestonePlanId);
      const refreshed = await getLifePlanBundle(authResult.userId, planId);
      return NextResponse.json(refreshed);
    }
    return NextResponse.json(bundle);
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
  planId?: string;
  action?: "create_scenario" | "set_primary" | "save_contingency";
  cloneFromPlanId?: string;
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
    const {
      contingency,
      action,
      cloneFromPlanId,
      planId,
      ...planInput
    } = body;

    if (action === "create_scenario") {
      const snapshot = await createLifePlanScenario(authResult.userId, {
        label: planInput.label ?? "Another life",
        cloneFromPlanId,
      });
      const bundle = await getLifePlanBundle(authResult.userId, snapshot.plan.id);
      return NextResponse.json(bundle);
    }

    if (action === "set_primary" && planId) {
      await setPrimaryLifePlan(authResult.userId, planId);
      const bundle = await getLifePlanBundle(authResult.userId, planId);
      return NextResponse.json(bundle);
    }

    if (action === "save_contingency" && planId && contingency) {
      await upsertContingencyPlan(
        authResult.userId,
        contingency.scenario,
        contingency.levers,
        planId,
      );
      const bundle = await getLifePlanBundle(authResult.userId, planId);
      return NextResponse.json(bundle);
    }

    const snapshot = await upsertLifePlan(authResult.userId, planInput, {
      planId,
    });

    if (contingency) {
      await upsertContingencyPlan(
        authResult.userId,
        contingency.scenario,
        contingency.levers,
        snapshot.plan.id,
      );
    }

    await recordMilestoneCrossings(authResult.userId, snapshot.plan.id);
    const bundle = await getLifePlanBundle(
      authResult.userId,
      snapshot.plan.id,
    );

    return NextResponse.json(bundle);
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

export async function DELETE(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId") ?? undefined;

  try {
    const removed = await deleteLifePlan(authResult.userId, planId);
    const bundle = await getLifePlanBundle(authResult.userId);
    return NextResponse.json({ ok: true, removed, ...bundle });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset life plan",
      },
      { status: 500 },
    );
  }
}
