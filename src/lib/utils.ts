export const generateShortCode = (length: number = 6): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const parseDuration = (duration: string | number): number => {
  if (typeof duration === 'number') return duration;

  const match = duration.match(/^(\d+)([mhdw]?)$/i);
  if (!match) throw new Error("Invalid duration. I accept '15m', '1h', '1d', '1w' and friends — 'forever' is not a unit.");

  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || 'h'; // default to hours if no unit

  switch (unit) {
    case 'm': return value / 60; // minutes to hours
    case 'h': return value;
    case 'd': return value * 24;
    case 'w': return value * 24 * 7;
    default: throw new Error("Unknown time unit. I know m, h, d and w — pick a letter I recognize.");
  }
};

export const expiryUrl = (url: string, duration: string | number = 24): { url: string; expiresAt: string } => {
  const hours = parseDuration(duration);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return { url, expiresAt };
};

/**
 * Normalizes opt-in one-time flags from JSON bodies (`boolean`) and
 * multipart form fields (`"true"` / `"1"` / `"on"`).
 */
export const parseOneTime = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === 'string') {
    return ['true', '1', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};
