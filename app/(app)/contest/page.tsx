import { redirect } from "next/navigation";
import { getCurrentActiveContest } from "@/lib/repository/contests";

// /contest is the legacy single-contest route. Now redirects to the current
// active contest's detail page, or the index if no contest is open or live.
export default async function ContestRedirectPage() {
  const active = await getCurrentActiveContest();
  redirect(active ? `/contests/${active.slug}` : "/contests");
}
