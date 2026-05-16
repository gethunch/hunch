import { redirect } from "next/navigation";

// Page renamed to /rating in v0.1; keep this redirect so any cached
// bookmarks or external links still land somewhere useful.
export default function LeaderboardRedirect() {
  redirect("/rating");
}
