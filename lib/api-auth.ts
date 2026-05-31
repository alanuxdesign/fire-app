import { auth, isDemoUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId };
}

export async function requireWritableUser(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (isDemoUser(session)) {
    return {
      error: NextResponse.json(
        { error: "Demo account is read-only" },
        { status: 403 },
      ),
    };
  }

  return { userId };
}
