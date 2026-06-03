"use client";

import { ManualAssetSheet } from "@/components/portfolio/ManualAssetSheet";
import { setBackfillPending } from "@/lib/backfill-pending";
import { Building2, PenLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  usePlaidLink,
  type PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";

type AddAccountButtonProps = {
  onLinked: () => Promise<void> | void;
  disabled?: boolean;
};

type Panel = "closed" | "chooser" | "manual";

export function AddAccountButton({ onLinked, disabled }: AddAccountButtonProps) {
  const [panel, setPanel] = useState<Panel>("closed");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [pendingPlaidOpen, setPendingPlaidOpen] = useState(false);
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
    return data.link_token;
  }, []);

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setPlaidLoading(true);
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

        const exchangeBody = (await exchangeResponse.json()) as {
          backfillStarted?: boolean;
        };

        if (exchangeBody.backfillStarted) {
          setBackfillPending();
        }

        const syncResponse = await fetch("/api/plaid/sync-accounts", {
          method: "POST",
        });

        if (!syncResponse.ok) {
          const body = (await syncResponse.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to sync accounts");
        }

        await onLinked();
        setLinkToken(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to link account");
      } finally {
        setPlaidLoading(false);
      }
    },
    [onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err, metadata) => {
      console.log("Plaid Link exited", { err, metadata });
      if (err) {
        setError(`Plaid error: ${err.error_code} - ${err.error_message}`);
      }
    },
  });

  useEffect(() => {
    if (pendingPlaidOpen && linkToken && ready) {
      open();
      setPendingPlaidOpen(false);
      setPlaidLoading(false);
    }
  }, [pendingPlaidOpen, linkToken, ready, open]);

  async function handleConnectBank() {
    setError(null);
    setPlaidLoading(true);
    setPanel("closed");
    setPendingPlaidOpen(true);

    try {
      if (!linkToken) {
        await fetchLinkToken();
      }
    } catch (err: unknown) {
      setPendingPlaidOpen(false);
      setPlaidLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to initialize Plaid",
      );
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setPanel("chooser")}
        disabled={disabled || plaidLoading}
        className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-[15px] font-medium text-slate-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {plaidLoading ? "Linking account…" : "+ Add account"}
      </button>

      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

      {panel === "chooser" ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setPanel("closed")}
          />

          <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white px-4 pb-6 pt-5 shadow-xl sm:rounded-2xl">
            <h3 className="text-center text-lg font-semibold text-slate-900">
              Add account
            </h3>
            <p className="mt-1 text-center text-sm text-slate-500">
              Connect an institution or enter an asset manually
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleConnectBank}
                disabled={plaidLoading}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3.5 text-left transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-slate-900">
                    Connect Bank/Brokerage
                  </span>
                  <span className="block text-sm text-slate-500">
                    Securely link via Plaid
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPanel("manual")}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3.5 text-left transition-colors hover:bg-stone-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <PenLine className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-slate-900">
                    Add Manually
                  </span>
                  <span className="block text-sm text-slate-500">
                    Real estate, vehicles, crypto, and more
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPanel("closed")}
              className="mt-4 w-full py-2 text-sm font-medium text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <ManualAssetSheet
        open={panel === "manual"}
        onClose={() => setPanel("closed")}
        onSaved={onLinked}
      />
    </div>
  );
}
