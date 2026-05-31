import { requireWritableUser } from "@/lib/api-auth";
import {
  createSnapshotIfNeeded,
  isCronAuthorized,
  snapshotAllUsers,
} from "@/lib/snapshots";
import { NextResponse } from "next/server";

async function handleSnapshot(request: Request) {
  try {
    if (isCronAuthorized(request)) {
      const result = await snapshotAllUsers();
      return NextResponse.json({
        mode: "cron",
        ...result,
      });
    }

    const authResult = await requireWritableUser();
    if ("error" in authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await createSnapshotIfNeeded(authResult.userId);

    return NextResponse.json({
      mode: "user",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create balance snapshot",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handleSnapshot(request);
}

export async function GET(request: Request) {
  return handleSnapshot(request);
}
