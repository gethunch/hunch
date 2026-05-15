"use server";

import { revalidatePath } from "next/cache";
import {
  CONTEST_FORMAT_WEEKLY_PICK_5,
  NIFTY_50_SYMBOLS,
  PICKS_PER_ENTRY,
} from "@/lib/constants";
import { getCurrentOpenContest } from "@/lib/repository/contests";
import { getEntryForUser, submitEntry } from "@/lib/repository/entries";
import { getCurrentUser } from "@/lib/repository/users";

export type SubmitResult = { ok: true } | { error: string };

export async function submitContestEntry(
  symbols: string[],
): Promise<SubmitResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };

  if (!Array.isArray(symbols)) return { error: "Bad input" };
  if (symbols.length !== PICKS_PER_ENTRY) {
    return { error: `Pick exactly ${PICKS_PER_ENTRY} stocks` };
  }
  if (new Set(symbols).size !== symbols.length) {
    return { error: "Duplicate pick" };
  }
  for (const s of symbols) {
    if (!NIFTY_50_SYMBOLS.has(s)) return { error: `Unknown symbol: ${s}` };
  }

  const contest = await getCurrentOpenContest(CONTEST_FORMAT_WEEKLY_PICK_5);
  if (!contest) return { error: "No contest open right now" };
  if (Date.now() >= contest.locksAt.getTime()) {
    return { error: "Submissions for this week are closed" };
  }

  const existing = await getEntryForUser(contest.id, user.id);
  if (existing) return { error: "You've already submitted this week" };

  await submitEntry({ contestId: contest.id, userId: user.id, symbols });

  revalidatePath("/contest");
  return { ok: true };
}
