// Market data — daily OHLC prices for NIFTY 50 symbols.
//
// Source: Yahoo Finance's unofficial chart endpoint
//   https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.NS?...
//
// Trade-offs:
//   - Free, no key, no auth, no rate-limit headers.
//   - Unofficial; no SLA. Could break or rate-limit at any time.
//   - Indian symbols use the `.NS` suffix (NSE listing on Yahoo).
//
// Scheduled use:
//   - open-contest cron (Mon 09:15 IST): fetchDailyPrices(monday, symbols) →
//     populate entry_price from `.open`.
//   - resolve-contest cron (Fri 15:35 IST): fetchDailyPrices(friday, symbols) →
//     populate exit_price from `.close`.
//
// If Yahoo breaks in prod, the migration path is to swap the implementation
// of `fetchOne()` to a different source while keeping the public shape.

export interface DailyPrice {
  symbol: string;
  date: string; // YYYY-MM-DD (IST)
  open: number;
  close: number;
}

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// Yahoo expects unix seconds. Convert an IST calendar date to a full-day window.
function dateToUnixRange(date: string): { period1: number; period2: number } {
  const start = new Date(`${date}T00:00:00+05:30`).getTime() / 1000;
  const end = new Date(`${date}T23:59:59+05:30`).getTime() / 1000;
  return { period1: Math.floor(start), period2: Math.floor(end) };
}

async function fetchOne(
  symbol: string,
  date: string,
): Promise<{ open: number; close: number } | null> {
  const { period1, period2 } = dateToUnixRange(date);
  const url =
    `${YAHOO_BASE}/${encodeURIComponent(symbol)}.NS` +
    `?period1=${period1}&period2=${period2}&interval=1d`;

  const res = await fetch(url, {
    // Default Node UA gets blocked by Yahoo sometimes.
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HunchBot/0.1)" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        indicators?: { quote?: Array<{ open?: (number | null)[]; close?: (number | null)[] }> };
      }>;
    };
  };

  const result = data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open;
  const closes = quote?.close;
  if (!opens || !closes || opens.length === 0) return null;

  // Walk from the most recent bar backward to find a complete OHLC row.
  for (let i = opens.length - 1; i >= 0; i--) {
    const o = opens[i];
    const c = closes[i];
    if (o != null && c != null) return { open: o, close: c };
  }
  return null;
}

// Run async fn over items with at most `limit` in-flight.
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

/**
 * Fetch open + close prices for a list of symbols on a given IST calendar date.
 * Concurrency capped at 8 — Yahoo refuses 50-way parallelism from a single IP.
 * Throws if any symbol has no data — the caller (cron) decides whether to
 * retry or fail loudly.
 */
export async function fetchDailyPrices(
  date: string,
  symbols: readonly string[],
): Promise<DailyPrice[]> {
  return await mapLimit(symbols, 8, async (symbol) => {
    const data = await fetchOne(symbol, date);
    if (!data) {
      throw new Error(`No price data for ${symbol} on ${date}`);
    }
    return { symbol, date, open: data.open, close: data.close };
  });
}
