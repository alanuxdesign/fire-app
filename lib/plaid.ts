import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  type PlaidError,
} from "plaid";

function getPlaidBasePath(): string {
  const env = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  if (env === "production") {
    return PlaidEnvironments.production;
  }
  return PlaidEnvironments.sandbox;
}

function createPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }

  const configuration = new Configuration({
    basePath: getPlaidBasePath(),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

const globalForPlaid = globalThis as unknown as { plaidClient?: PlaidApi };

export const plaidClient = globalForPlaid.plaidClient ?? createPlaidClient();

if (process.env.NODE_ENV !== "production") {
  globalForPlaid.plaidClient = plaidClient;
}

export function getPlaidErrorMessage(error: unknown): string {
  const plaidError = error as { response?: { data?: PlaidError } };
  return (
    plaidError.response?.data?.error_message ??
    (error instanceof Error ? error.message : "Plaid request failed")
  );
}
