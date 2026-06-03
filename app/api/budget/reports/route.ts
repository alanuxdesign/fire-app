import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import { savedReports } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const rows = await db.query.savedReports.findMany({
    where: eq(savedReports.userId, authResult.userId),
    orderBy: [desc(savedReports.createdAt)],
  });

  return NextResponse.json({
    reports: rows.map((r) => ({
      id: r.id,
      name: r.name,
      filters: r.filters,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    name?: string;
    filters?: Record<string, unknown>;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(savedReports)
    .values({
      userId: authResult.userId,
      name: body.name.trim(),
      filters: body.filters ?? {},
    })
    .returning();

  return NextResponse.json({
    report: {
      id: row.id,
      name: row.name,
      filters: row.filters,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
