import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";

export default async function ContestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-1">
          <p className="text-sm text-zinc-500">Hello, {user.displayName}</p>
          <p className="text-3xl font-medium tabular-nums">
            {user.rating.toLocaleString("en-IN")}
            <span className="text-zinc-500 text-lg ml-2">
              · {user.contestsPlayed} contests
            </span>
          </p>
        </header>
        <section className="border border-zinc-900 rounded-lg p-6">
          <p className="text-sm text-zinc-500">
            Contest UI lands in Phase 2. For now this page just confirms
            sign-in worked.
          </p>
        </section>
      </div>
    </main>
  );
}
