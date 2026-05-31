"use client";

import { useCallback, useEffect, useState } from "react";
import {
  usePlaidLink,
  type PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";

type AddAccountButtonProps = {
  onLinked: () => Promise<void> | void;
  disabled?: boolean;
};

export function AddAccountButton({ onLinked, disabled }: AddAccountButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    const response = await fetch("/api/plaid/create-link-token", {
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to create link token");
    }

    const data = (await response.json()) as { link_token: string };
    setLinkToken(data.link_token);
  }, []);

  useEffect(() => {
    fetchLinkToken().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to initialize Plaid");
    });
  }, [fetchLinkToken]);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true);
      setError(null);

      try {
        const exchangeResponse = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            metadata,
          }),
        });

        if (!exchangeResponse.ok) {
          const body = (await exchangeResponse.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to link account");
        }

        const syncResponse = await fetch("/api/plaid/sync-accounts", {
          method: "POST",
        });

        if (!syncResponse.ok) {
          const body = (await syncResponse.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to sync accounts");
        }

        await onLinked();
        await fetchLinkToken();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to link account");
      } finally {
        setLoading(false);
      }
    },
    [fetchLinkToken, onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => open()}
        disabled={disabled || loading || !ready || !linkToken}
        className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-[15px] font-medium text-slate-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Linking account…" : "+ Add account"}
      </button>
      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
