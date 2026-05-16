import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

// Lands here after a user clicks the email-verification link Supabase sends in
// response to `auth.updateUser({ email })`. Exchange the code for a session,
// then mirror the verified email + timestamp onto our `users` row.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(
    url.searchParams.get("next"),
    "/contest?email=verified",
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/contest?email=missing-code", url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/contest?email=verify-failed`, url.origin),
    );
  }

  // After the exchange Supabase has updated auth.user.email + email_confirmed_at.
  // Mirror that on our users row.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser?.email && authUser.email_confirmed_at) {
    // Promote: Supabase has confirmed the new address, so move it from
    // pending_email → email and clear the pending slot. emailVerifiedAt
    // anchors when verification happened.
    await db
      .update(users)
      .set({
        email: authUser.email,
        pendingEmail: null,
        emailVerifiedAt: new Date(authUser.email_confirmed_at),
      })
      .where(eq(users.id, authUser.id));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
