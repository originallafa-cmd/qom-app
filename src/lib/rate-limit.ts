// Simple in-memory rate limiter for login attempts
// Resets on server restart (acceptable for Vercel serverless — each cold start resets)
// For persistent rate limiting, use Upstash Redis

const attempts: Map<string, { count: number; resetAt: number }> = new Map();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  // Clean expired entries
  if (entry && entry.resetAt < now) {
    attempts.delete(key);
  }

  const current = attempts.get(key);

  if (!current) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
  }

  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetIn: current.resetAt - now };
  }

  current.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - current.count, resetIn: current.resetAt - now };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}
