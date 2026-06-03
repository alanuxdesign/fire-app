import { requireWritableUser } from "@/lib/api-auth";
import { syncUserTransactions } from "@/lib/plaid-transactions";
import type { TransactionSyncProgress } from "@/lib/transaction-sync-progress";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const stream = searchParams.get("stream") === "1";

  if (!stream) {
    const result = await syncUserTransactions(authResult.userId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        const result = await syncUserTransactions(authResult.userId, (progress) => {
          send({ type: "progress", ...progress });
        });

        if ("error" in result) {
          send({ type: "error", error: result.error });
        } else {
          send({ type: "done", result });
        }
      } catch (error) {
        send({
          type: "error",
          error:
            error instanceof Error ? error.message : "Transaction sync failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
