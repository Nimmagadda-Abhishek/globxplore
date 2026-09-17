const rateLimit = require('express-rate-limit');

/**
 * Window duration: 10 minutes
 */
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Max requests per role per window
 */
const MAX_REQUESTS = 100;

/**
 * Known roles in the system.
 * Each role gets its OWN independent rate-limit bucket keyed by `role:ip`.
 */
const ROLES = [
  'ADMIN',
  'AGENT_MANAGER',
  'AGENT',
  'TELECALLER',
  'COUNSELLOR',
  'VISA_AGENT',
  'ALUMNI_MANAGER',
  'STUDENT',
  'GUEST', // unauthenticated / fallback
];

/**
 * Build one limiter per role so buckets are fully isolated.
 * Key = "<ROLE>:<ip>" — prevents one role's traffic from eating another's quota.
 */
const limiters = {};

ROLES.forEach((role) => {
  limiters[role] = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `${role}:${ip}`;
    },
    validate: { keyGeneratorIpFallback: false },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for role "${role}". Maximum ${MAX_REQUESTS} requests per 10 minutes.`,
        retryAfter: Math.ceil(WINDOW_MS / 1000 / 60), // minutes
      });
    },
    standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
  });
});

/**
 * Middleware: resolves the current user's role (or 'GUEST' for unauthenticated
 * requests) and applies the corresponding role-specific rate limiter.
 *
 * Must be placed AFTER auth middleware on protected routes,
 * but also works on public routes (falls back to GUEST bucket).
 */
exports.roleRateLimiter = (req, res, next) => {
  // req.user is populated by the auth middleware on protected routes
  const role = (req.user && req.user.role)
    ? req.user.role.toUpperCase()
    : 'GUEST';

  const limiter = limiters[role] || limiters['GUEST'];
  return limiter(req, res, next);
};
