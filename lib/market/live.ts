// Live intraday price fetcher for the contest live leaderboard.
//
// Yahoo's /v7/finance/quote endpoint now requires auth, so we fall back to
// /v8/finance/chart with range=1d&interval=1d and read `meta.regularMarketPrice`
// (which holds Yahoo's current live price regardless of bar interval).
//
// Server-side cached via unstable_cache with a 60s revalidation window so the
// page can be re-rendered on every request without hammering Yahoo. Tag
// `live-prices` lets us trigger revalidation on demand later if needed.

import { unstable_cache } from "next/cache";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

async function mapLimit<T, U>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let idx = 0;
  const worker = async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

async function fetchLastPriceOne(
  symbol: string,
  suffix = ".NS",
): Promise<number | null> {
  const url =
    `${YAHOO_BASE}/${encodeURIComponent(symbol)}${suffix}` +
    `?range=1d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HunchBot/0.1)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{ meta?: { regularMarketPrice?: number } }>;
      };
    };
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

// Internal: array form so unstable_cache can serialize the result (it can't
// round-trip Maps).
async function fetchLastPricesInner(
  symbols: readonly string[],
): Promise<Array<{ symbol: string; price: number }>> {
  const results = await mapLimit(symbols, 6, async (s) => ({
    symbol: s,
    price: await fetchLastPriceOne(s),
  }));
  return results.filter(
    (r): r is { symbol: string; price: number } => r.price != null,
  );
}

// 60s server-side cache. Cache key is keyed off the cache prefix + the
// serialized arguments — since we pass the full NIFTY 50 list every time,
// the cache stays at one entry for all viewers.
const cachedFetch = unstable_cache(fetchLastPricesInner, ["live-prices"], {
  revalidate: 60,
  tags: ["live-prices"],
});

export async function fetchLastPrices(
  symbols: readonly string[],
): Promise<Map<string, number>> {
  const arr = await cachedFetch(symbols);
  return new Map(arr.map((r) => [r.symbol, r.price]));
}

// NIFTY 50 index live price + previous close. Same caching window.
async function fetchIndexLastPriceInner(): Promise<{
  regular: number;
  previous: number;
} | null> {
  const url = `${YAHOO_BASE}/${encodeURIComponent("^NSEI")}` +
    `?range=2d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HunchBot/0.1)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
          };
        }>;
      };
    };
    const meta = data?.chart?.result?.[0]?.meta;
    if (
      typeof meta?.regularMarketPrice !== "number" ||
      typeof meta?.chartPreviousClose !== "number"
    ) {
      return null;
    }
    return {
      regular: meta.regularMarketPrice,
      previous: meta.chartPreviousClose,
    };
  } catch {
    return null;
  }
}

export const fetchIndexLastPrice = unstable_cache(
  fetchIndexLastPriceInner,
  ["live-index-nse"],
  { revalidate: 60, tags: ["live-prices"] },
);
