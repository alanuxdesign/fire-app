import { estimateFromZip } from "@/lib/col-estimates";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim();
  const householdRaw = searchParams.get("householdSize");
  const householdSize = householdRaw ? Number.parseInt(householdRaw, 10) : 1;

  if (!zip) {
    return NextResponse.json({ error: "ZIP code is required" }, { status: 400 });
  }

  const result = await estimateFromZip(zip, householdSize);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ estimate: result });
}
