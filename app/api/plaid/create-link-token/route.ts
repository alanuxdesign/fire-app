import { requireWritableUser } from "@/lib/api-auth";
import { plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { and, eq } from "drizzle-orm";
import { CountryCode, Products } from "plaid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  let itemId: string | undefined;
  try {
    const body = (await request.json()) as { itemId?: string };
    itemId = body.itemId;
  } catch {
    // no body — new Link session
  }

  try {
    let accessToken: string | undefined;
    if (itemId) {
      const item = await db.query.plaidItems.findFirst({
        where: and(
          eq(plaidItems.id, itemId),
          eq(plaidItems.userId, authResult.userId),
        ),
      });
      if (!item) {
        return NextResponse.json({ error: "Institution not found" }, { status: 404 });
      }
      accessToken = item.accessToken;
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: authResult.userId },
      client_name: "Fire",
      products: [Products.Transactions],
      optional_products: [
        Products.Investments,
        Products.Liabilities,
      ],
      country_codes: [CountryCode.Us],
      language: "en",
      ...(accessToken ? { access_token: accessToken } : {}),
      transactions: {
        days_requested: 730,
      },
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
