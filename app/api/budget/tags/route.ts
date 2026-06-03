import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import { budgetTags } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const tags = await db.query.budgetTags.findMany({
    where: eq(budgetTags.userId, authResult.userId),
  });

  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [tag] = await db
    .insert(budgetTags)
    .values({
      userId: authResult.userId,
      name,
      color: body.color ?? null,
    })
    .returning();

  return NextResponse.json({ tag });
}
