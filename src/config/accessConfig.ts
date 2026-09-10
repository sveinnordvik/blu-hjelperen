// src/config/accessConfig.ts

/**
 * List of users with full, unlimited VIP access across all tools in BLU-Hjelperen,
 * including Humanizer-boten (unlimited washes/free from pay-per-use paywalls),
 * all pedagogical analysis tools, roleplay simulators, presentations, and admin tools.
 */
export const UNLIMITED_ACCESS_EMAILS = [
  'svein.nordvik@gmail.com',
  'sunniva.nordvik2@gmail.com',
  'annkarin78@hotmail.no'
];

export const ADMIN_EMAILS = [
  'svein.nordvik@gmail.com',
  'sunniva.nordvik2@gmail.com'
];

/**
 * Check if an email has unlimited access to all tools and features (including Humanizer-boten)
 */
export const isUnlimitedUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return UNLIMITED_ACCESS_EMAILS.some(e => e.toLowerCase() === normalized);
};

/**
 * Check if an email has admin system rights
 */
export const isAdminUser = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(e => e.toLowerCase() === normalized);
};
