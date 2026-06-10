import { expressjwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

const DEV_ADMIN_SECRET = "serveaso-test-push-secret";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PUBLIC_MUTATION_PATTERNS = [
  /^\/api\/customer$/,
  /^\/api\/auth\/otp\//,
  /^\/api\/service-providers\/nearby-monthly$/,
  /^\/api\/service-providers\/\d+\/check-schedule$/,
  /^\/api\/service-providers\/check-email$/,
  /^\/api\/service-providers\/check-mobile$/,
  /^\/api\/service-providers\/serviceprovider\/add$/,
];

export function isAuthConfigured() {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() && process.env.AUTH0_AUDIENCE?.trim()
  );
}

function shouldProtectMutations() {
  if (process.env.JWT_PROTECT_MUTATIONS === "false") {
    return false;
  }
  if (process.env.JWT_PROTECT_MUTATIONS === "true") {
    return isAuthConfigured();
  }
  return isProduction() && isAuthConfigured();
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

let checkJwtMiddleware = null;

export function getCheckJwt() {
  if (!checkJwtMiddleware && isAuthConfigured()) {
    checkJwtMiddleware = expressjwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      }),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ["RS256"],
    });
  }
  return checkJwtMiddleware;
}

export function hasValidBypassSecret(req) {
  const expected = (
    process.env.INTERNAL_NOTIFY_SECRET ||
    process.env.ADMIN_PUSH_SECRET ||
    process.env.ADMIN_TICKET_SECRET ||
    ""
  ).trim();
  const adminProvided = String(
    req.headers["x-admin-push-secret"] || req.headers["x-admin-api-secret"] || ""
  ).trim();
  const internalProvided = String(req.headers["x-internal-secret"] || "").trim();
  if (expected && (adminProvided === expected || internalProvided === expected)) {
    return true;
  }
  if (!isProduction() && adminProvided === DEV_ADMIN_SECRET) {
    return true;
  }
  return false;
}

function normalizePath(req) {
  return (req.originalUrl || req.url || req.path || "").split("?")[0];
}

function isPublicMutation(req) {
  const path = normalizePath(req);
  if (SAFE_METHODS.has(req.method)) {
    return true;
  }
  if (path === "/health" || path === "/ready" || path === "/metrics" || path.startsWith("/api-docs")) {
    return true;
  }
  return PUBLIC_MUTATION_PATTERNS.some((pattern) => pattern.test(path));
}

/** Require Auth0 JWT on mutating routes unless registration/OTP/discovery paths. */
export function requireJwtOnMutations(req, res, next) {
  if (!shouldProtectMutations()) {
    return next();
  }
  if (isPublicMutation(req)) {
    return next();
  }
  if (hasValidBypassSecret(req)) {
    return next();
  }

  const checkJwt = getCheckJwt();
  if (!checkJwt) {
    return next();
  }
  return checkJwt(req, res, next);
}
