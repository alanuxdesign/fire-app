import { requireUserId } from "@/lib/api-auth";
import {
  getSnapshotsForUser,
  parseSnapshotRange,
} from "@/lib/snapshots";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = parseSnapshotRange(searchParams.get("range"));
    const snapshots = await getSnapshotsForUser(authResult.userId, range);

    return NextResponse.json({ range, snapshots });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load snapshots",
      },
      { status: 500 },
    );
  }
}
