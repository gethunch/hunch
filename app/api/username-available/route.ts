import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { USERNAME_REGEX } from "@/lib/identity";

export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get("u")?.trim() ?? "";

  const valid = USERNAME_REGEX.test(u);
  if (!valid) {
    return NextResponse.json({ valid: false, available: false });
  }

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${u})`)
    .limit(1);

  return NextResponse.json({ valid: true, available: rows.length === 0 });
}
