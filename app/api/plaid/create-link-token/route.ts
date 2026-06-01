import { requireWritableUser } from "@/lib/api-auth";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
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
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
