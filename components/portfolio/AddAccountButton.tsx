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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      setPlaidLoading(true);
      setError(null);

      try {
        if (!publicToken) {
          const syncResponse = await fetch("/api/plaid/sync-transactions", {
            method: "POST",
          });
          if (!syncResponse.ok) {
            const body = (await syncResponse.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to sync transactions");
          }
          await onLinked();
          setLinkToken(null);
          return;
        }

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
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-semibold text-on-primary shadow-soft transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {plaidLoading ? "Linking account…" : "+ Add account"}
      </button>

      {error ? <p className="text-center text-sm text-loss">{error}</p> : null}

      {panel === "chooser" ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setPanel("closed")}
          />

          <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-surface px-4 pb-6 pt-5 shadow-xl sm:rounded-2xl">
            <h3 className="text-center text-lg font-semibold text-ink">
              Add account
            </h3>
            <p className="mt-1 text-center text-sm text-ink-secondary">
              Connect an institution or enter an asset manually
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleConnectBank}
                disabled={plaidLoading}
                className="flex w-full items-center gap-3 rounded-2xl bg-canvas-sunken px-4 py-3.5 text-left shadow-soft ring-1 ring-hairline transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card disabled:opacity-50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green">
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-ink">
                    Connect Bank/Brokerage
                  </span>
                  <span className="block text-sm text-ink-secondary">
                    Securely link via Plaid
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPanel("manual")}
                className="flex w-full items-center gap-3 rounded-2xl bg-canvas-sunken px-4 py-3.5 text-left shadow-soft ring-1 ring-hairline transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-purple-soft text-accent-purple">
                  <PenLine className="h-5 w-5" strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-ink">
                    Add Manually
                  </span>
                  <span className="block text-sm text-ink-secondary">
                    Real estate, vehicles, crypto, and more
                  </span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPanel("closed")}
              className="mt-4 w-full py-2 text-sm font-medium text-ink-secondary"
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
