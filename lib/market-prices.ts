export async function fetchMarketPrice(symbol: string): Promise<number | null> {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(trimmed)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "fire-app/1.0",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number };
        }>;
      };
    };

    const price = body.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}
