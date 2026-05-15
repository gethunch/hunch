// Validation constants shared across server + client (onboarding form,
// API route, server actions, profile editors).

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_MAX_LEN = 40;
export const USERNAME_MAX_LEN = 20;
export const EMAIL_MAX_LEN = 254;
