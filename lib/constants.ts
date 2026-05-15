// Hardcoded NIFTY 50 list. The index is rebalanced semi-annually by NSE;
// when constituents change, edit this list. Single source of truth.
//
// Symbol = NSE ticker as it appears at https://www.nseindia.com (no suffix).
// Name = the display string shown in the UI.

export interface Nifty50Stock {
  symbol: string;
  name: string;
}

export const NIFTY_50: readonly Nifty50Stock[] = [
  { symbol: "ADANIENT", name: "Adani Enterprises" },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals" },
  { symbol: "ASIANPAINT", name: "Asian Paints" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance" },
  { symbol: "BEL", name: "Bharat Electronics" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "BPCL", name: "Bharat Petroleum" },
  { symbol: "BRITANNIA", name: "Britannia Industries" },
  { symbol: "CIPLA", name: "Cipla" },
  { symbol: "COALINDIA", name: "Coal India" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories" },
  { symbol: "EICHERMOT", name: "Eicher Motors" },
  { symbol: "GRASIM", name: "Grasim Industries" },
  { symbol: "HCLTECH", name: "HCL Technologies" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp" },
  { symbol: "HINDALCO", name: "Hindalco Industries" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "JSWSTEEL", name: "JSW Steel" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "M&M", name: "Mahindra & Mahindra" },
  { symbol: "MARUTI", name: "Maruti Suzuki" },
  { symbol: "NESTLEIND", name: "Nestle India" },
  { symbol: "NTPC", name: "NTPC" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp." },
  { symbol: "POWERGRID", name: "Power Grid Corp." },
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "SBILIFE", name: "SBI Life Insurance" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "TATASTEEL", name: "Tata Steel" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "TECHM", name: "Tech Mahindra" },
  { symbol: "TITAN", name: "Titan Company" },
  { symbol: "TRENT", name: "Trent" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement" },
  { symbol: "WIPRO", name: "Wipro" },
];

export const NIFTY_50_SYMBOLS: ReadonlySet<string> = new Set(
  NIFTY_50.map((s) => s.symbol),
);

// Contest format identifiers. v1 only writes WEEKLY_PICK_5.
// Future formats (daily, fixed-allocation, variable N) get their own constants.
export const CONTEST_FORMAT_WEEKLY_PICK_5 = "weekly_pick_5";

export const PICKS_PER_ENTRY = 5;

// =======================================================================
// IST date helpers
// =======================================================================
// India Standard Time is a fixed offset of UTC+05:30 with no DST.
// We compute everything in IST wall clock and store as either:
//   - YYYY-MM-DD strings for date columns (period_start)
//   - ISO timestamps with +05:30 offset for timestamptz columns

const IST_TZ = "Asia/Kolkata";

export function istDateString(d: Date = new Date()): string {
  // Returns YYYY-MM-DD in IST. Using sv-SE locale because it formats as
  // ISO-like "YYYY-MM-DD HH:MM:SS" which is easy to slice.
  return d.toLocaleString("sv-SE", { timeZone: IST_TZ }).slice(0, 10);
}

export function istWeekday(d: Date = new Date()): number {
  // 0 = Sunday … 6 = Saturday, in IST.
  const short = d.toLocaleString("en-US", {
    timeZone: IST_TZ,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[short];
}

export function istHourMinute(d: Date = new Date()): {
  hour: number;
  minute: number;
} {
  const t = d.toLocaleTimeString("en-GB", {
    timeZone: IST_TZ,
    hour12: false,
  });
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return { hour: h, minute: m };
}

// Returns the YYYY-MM-DD date of the next contest's Monday in IST.
// "Next" = the upcoming Monday whose 09:15 IST has not yet passed.
// If we're called on Monday before 09:15 IST, this returns today's date.
// If we're called on Monday at/after 09:15 IST, this returns next Monday.
export function nextContestMondayIST(now: Date = new Date()): string {
  const weekday = istWeekday(now);
  const { hour, minute } = istHourMinute(now);
  const pastMonday915 =
    weekday === 1 && (hour > 9 || (hour === 9 && minute >= 15));

  let daysToAdd: number;
  if (weekday === 1 && !pastMonday915) {
    daysToAdd = 0;
  } else if (weekday === 1 && pastMonday915) {
    daysToAdd = 7;
  } else {
    daysToAdd = (8 - weekday) % 7;
  }

  const target = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return istDateString(target);
}

// Compute the timestamps for a weekly_pick_5 contest given its Monday date.
//   opens_at   = Monday   09:15 IST  (entries close, market opens)
//   locks_at   = Monday   09:15 IST  (alias of opens_at)
//   resolves_at = Friday  15:30 IST
export function contestTimestampsForMonday(mondayDate: string): {
  opensAt: Date;
  locksAt: Date;
  resolvesAt: Date;
} {
  const opensAt = new Date(`${mondayDate}T09:15:00+05:30`);
  const locksAt = opensAt;
  const fridayDate = addDaysToISODate(mondayDate, 4);
  const resolvesAt = new Date(`${fridayDate}T15:30:00+05:30`);
  return { opensAt, locksAt, resolvesAt };
}

function addDaysToISODate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`); // noon UTC to avoid DST/edge issues
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
