import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env)
// For local development without Upstash, this will gracefully degrade
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    })
  : null;

// Create rate limiter instances
export const chatRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per 60 seconds
      analytics: true,
      prefix: "ratelimit:chat",
    })
  : null;

export const circleRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per 60 seconds (more conservative)
      analytics: true,
      prefix: "ratelimit:circle",
    })
  : null;

/**
 * Check rate limit for a given identifier
 * Returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!limiter) {
    // Rate limiting disabled (no Redis configured)
    console.warn("Rate limiting is disabled - Redis not configured");
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return { success, limit, remaining, reset };
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0] || "unknown";

  return ip.trim();
}
