import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/repository/users";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Self-heal: if the DB row says onboarded but Supabase user_metadata.onboarded
  // isn't set (existing users from before the proxy gate read the flag), sync
  // it now so the proxy stops bouncing them here.
  if (user.onboarded) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser && authUser.user_metadata?.onboarded !== true) {
        await supabase.auth.updateUser({ data: { onboarded: true } });
      }
    } catch (err) {
      console.error("[onboarding/page] metadata sync threw:", err);
    }
    redirect("/contest");
  }

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
