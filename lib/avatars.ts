// Avatar source-of-truth — preset list + validators.
//
// avatar_url is either:
//   - a preset path like "/avatars/preset-03.svg" or "/avatars/default.svg"
//   - a Supabase Storage URL for the current user's avatar:
//     "<SUPABASE_URL>/storage/v1/object/public/avatars/<user_id>/avatar.<ext>"

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

export const DEFAULT_AVATAR = "/avatars/default.svg";

const PRESET_SET = new Set<string>([DEFAULT_AVATAR, ...AVATAR_PRESETS]);

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

export function resolveAvatarUrl(url: string | null | undefined): string {
  return url ?? DEFAULT_AVATAR;
}
