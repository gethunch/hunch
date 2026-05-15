import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // The (app) layout already bounces onboarded users out — defensive duplicate.
  if (user.onboarded) redirect("/contest");

  return (
    <main className="max-w-md mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-medium">Finish setting up</h1>
        <p className="text-sm text-zinc-500">
          A few details before you can play.
        </p>
      </header>
      <OnboardingForm userId={user.id} />
    </main>
  );
}
