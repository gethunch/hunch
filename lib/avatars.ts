// Avatar source-of-truth — preset list + validators.
//
// avatar_url is either:
//   - a preset path like "/avatars/preset-03.svg"
//   - a Supabase Storage URL for the current user's avatar:
//     "<SUPABASE_URL>/storage/v1/object/public/avatars/<user_id>/avatar.<ext>"
//
// A null avatar_url renders deterministically: hash(user_id) → one of the
// 8 presets. Same user always sees the same fallback preset.

export const AVATAR_PRESETS = [
  "/avatars/preset-01.svg",
  "/avatars/preset-02.svg",
  "/avatars/preset-03.svg",
  "/avatars/preset-04.svg",
  "/avatars/preset-05.svg",
  "/avatars/preset-06.svg",
  "/avatars/preset-07.svg",
  "/avatars/preset-08.svg",
] as const;

function hashToPresetIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % AVATAR_PRESETS.length;
}

export function fallbackPresetForUser(userId: string): string {
  return AVATAR_PRESETS[hashToPresetIndex(userId)];
}

const PRESET_SET = new Set<string>(AVATAR_PRESETS);

export function isPresetAvatar(url: string): boolean {
  return PRESET_SET.has(url);
}

export function storageAvatarPrefix(userId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/avatars/${userId}/`;
}

export function isOwnStorageAvatar(url: string, userId: string): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  return url.startsWith(storageAvatarPrefix(userId));
}

export function isValidAvatarForUser(url: string, userId: string): boolean {
  return isPresetAvatar(url) || isOwnStorageAvatar(url, userId);
}

export function resolveAvatarUrl(
  url: string | null | undefined,
  userId: string,
): string {
  return url ?? fallbackPresetForUser(userId);
}
