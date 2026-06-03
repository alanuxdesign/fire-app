import type { TransactionSyncProgress } from "@/lib/transaction-sync-progress";

export type SyncStreamEvent =
  | ({ type: "progress" } & TransactionSyncProgress)
  | {
      type: "done";
      result: {
        added: number;
        modified: number;
        removed: number;
        itemsSynced: number;
      };
    }
  | { type: "error"; error: string };

export async function syncTransactionsWithProgress(
  onProgress: (progress: TransactionSyncProgress) => void,
  signal?: AbortSignal,
): Promise<
  | { added: number; modified: number; removed: number; itemsSynced: number }
  | { error: string }
> {
  const response = await fetch("/api/plaid/sync-transactions?stream=1", {
    method: "POST",
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? `Sync failed (${response.status})` };
  }

  if (!response.body) {
    return { error: "No response body from sync" };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as SyncStreamEvent;
      if (event.type === "progress") {
        onProgress(event);
      } else if (event.type === "done") {
        return event.result;
      } else if (event.type === "error") {
        return { error: event.error };
      }
    }
  }

  return { error: "Sync ended unexpectedly" };
}
