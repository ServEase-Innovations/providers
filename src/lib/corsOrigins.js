export function parseCorsOrigins() {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    process.env.APP_URL ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.length === 0) {
    return !isProduction();
  }
  return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

export function corsOriginCallback(allowedOrigins) {
  return (origin, cb) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return cb(null, true);
    }
    return cb(null, false);
  };
}

export function assertCorsOriginsProduction() {
  if (!isProduction()) {
    return;
  }
  const origins = parseCorsOrigins();
  if (origins.length === 0) {
    throw new Error(
      "CORS_ORIGINS is required when NODE_ENV=production (comma-separated web/mobile origins)"
    );
  }
}
