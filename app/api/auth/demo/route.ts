import { DEMO_EMAIL } from "@/lib/demo";
import { signIn } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await signIn("demo", {
      email: DEMO_EMAIL,
      redirect: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo sign-in failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/portfolio", request.url));
}
