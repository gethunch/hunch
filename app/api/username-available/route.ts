import { NextResponse } from "next/server";
import { isUsernameTaken } from "@/lib/repository/users";
import { USERNAME_REGEX } from "@/lib/identity";

export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get("u")?.trim() ?? "";

  const valid = USERNAME_REGEX.test(u);
  if (!valid) {
    return NextResponse.json({ valid: false, available: false });
  }

  const available = !(await isUsernameTaken(u));
  return NextResponse.json({ valid: true, available });
}
