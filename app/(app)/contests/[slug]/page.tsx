import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import { getContestBySlug } from "@/lib/repository/contests";
import {
  formatLabel,
  formatPeriod,
} from "@/lib/contest-display";

// Phase 12 stub. Real layouts (past / live / upcoming) land in Phases 13–15.
export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) notFound();

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-medium">
          {formatLabel(contest.format)} · {formatPeriod(contest.periodStart)}
        </h1>
        <p className="text-sm text-zinc-500">
          Status: {contest.status} · {contest.entryCount}{" "}
          {contest.entryCount === 1 ? "entry" : "entries"}
        </p>
      </header>
      <p className="text-sm text-zinc-600 border border-dashed border-zinc-900 rounded-lg p-4">
        Full detail page coming next.
      </p>
    </main>
  );
}
