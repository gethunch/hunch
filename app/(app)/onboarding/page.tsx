import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // The (app) layout already bounces onboarded users out — this is belt &
  // braces in case someone hits the route directly during the brief moment
  // between layout-check and page-render.
  if (user.onboarded) redirect("/contest");

  return (
    <main className="max-w-md mx-auto px-6 py-16 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-medium">Finish setting up</h1>
        <p className="text-sm text-zinc-500">
          A few details so the leaderboard can show who you are.
        </p>
      </header>
      <div className="border border-zinc-900 rounded-lg p-6 text-sm text-zinc-500">
        Onboarding form lands in the next phase.
      </div>
    </main>
  );
}
