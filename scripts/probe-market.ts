// Smoke test the market data module against a known past trading day.
// Run: npm run probe:market

import { fetchDailyPrices } from "@/lib/market";

async function main() {
  // Sample of 5 symbols. Date is the last full trading day before
  // 2026-05-15 (Fri) — using Wednesday to avoid weekends if today
  // changes. Edit if you want to probe a specific date.
  const date = "2026-05-13";
  const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC"];

  console.log(`Fetching ${symbols.length} symbols for ${date}…`);
  try {
    const prices = await fetchDailyPrices(date, symbols);
    for (const p of prices) {
      console.log(
        `  ${p.symbol.padEnd(12)} open=${p.open.toFixed(2).padStart(10)}  close=${p.close.toFixed(2).padStart(10)}`,
      );
    }
    console.log("OK");
    process.exit(0);
  } catch (err) {
    console.error("Fetch failed:", err);
    process.exit(1);
  }
}

main();
