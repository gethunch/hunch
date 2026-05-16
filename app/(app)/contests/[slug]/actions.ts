"use server";

import { revalidatePath } from "next/cache";
import {
  CONTEST_FORMAT_WEEKLY_PICK_5,
  NIFTY_50_SYMBOLS,
  PICKS_PER_ENTRY,
} from "@/lib/constants";
import { getContestBySlug } from "@/lib/repository/contests";
import {
  getEntryForUser,
  submitEntry,
  updateEntry,
} from "@/lib/repository/entries";
import { getCurrentUser } from "@/lib/repository/users";

export type SubmitResult = { ok: true } | { error: string };

function validateSymbols(symbols: unknown): SubmitResult {
  if (!Array.isArray(symbols)) return { error: "Bad input" };
  if (symbols.length !== PICKS_PER_ENTRY) {
    return { error: `Pick exactly ${PICKS_PER_ENTRY} stocks` };
  }
  if (new Set(symbols).size !== symbols.length) {
    return { error: "Duplicate pick" };
  }
  for (const s of symbols) {
    if (typeof s !== "string" || !NIFTY_50_SYMBOLS.has(s)) {
      return { error: `Unknown symbol: ${s}` };
    }
  }
  return { ok: true };
}

export async function submitContestEntry(
  slug: string,
  symbols: string[],
): Promise<SubmitResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const validation = validateSymbols(symbols);
  if ("error" in validation) return validation;

  const contest = await getContestBySlug(slug);
  if (!contest) return { error: "Contest not found" };
  if (contest.format !== CONTEST_FORMAT_WEEKLY_PICK_5) {
    return { error: "Unsupported contest format" };
  }
  if (contest.status !== "open") {
    return { error: "This contest is not accepting entries" };
  }
  if (Date.now() >= contest.locksAt.getTime()) {
    return { error: "Submissions for this week are closed" };
  }

  const existing = await getEntryForUser(contest.id, user.id);
  if (existing) return { error: "You've already submitted this week" };

  await submitEntry({ contestId: contest.id, userId: user.id, symbols });

  revalidatePath(`/contests/${slug}`);
  return { ok: true };
}

export async function updateContestEntry(
  slug: string,
  symbols: string[],
): Promise<SubmitResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  const validation = validateSymbols(symbols);
  if ("error" in validation) return validation;

  const contest = await getContestBySlug(slug);
  if (!contest) return { error: "Contest not found" };
  if (contest.status !== "open") return { error: "Picks are locked" };
  if (Date.now() >= contest.locksAt.getTime()) {
    return { error: "Picks are locked" };
  }

  const existing = await getEntryForUser(contest.id, user.id);
  if (!existing) return { error: "No entry to update" };

  await updateEntry({ entryId: existing.entry.id, symbols });

  revalidatePath(`/contests/${slug}`);
  return { ok: true };
}
