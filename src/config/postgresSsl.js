import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(__dirname, "../..");

function findMonorepoRoot(fromDir = process.cwd()) {
  let d = path.resolve(fromDir);
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, "package.json")) && fs.existsSync(path.join(d, "services"))) {
      return d;
    }
    d = path.dirname(d);
  }
  return null;
}

function readCaPem(env = process.env) {
  const inline = env.POSTGRES_SSL_CA?.trim();
  if (inline && inline.includes("BEGIN CERTIFICATE")) {
    return { pem: inline, source: "POSTGRES_SSL_CA" };
  }

  const explicitPath = env.POSTGRES_SSL_CA_PATH?.trim();
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(serviceRoot, explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`POSTGRES_SSL_CA_PATH not found: ${resolved}`);
    }
    return { pem: fs.readFileSync(resolved, "utf8"), source: resolved };
  }

  const candidates = [
    path.join(serviceRoot, "certs", "rds-global-bundle.pem"),
  ];
  const root = findMonorepoRoot(serviceRoot);
  if (root) {
    candidates.push(
      path.join(root, "certs", "rds-global-bundle.pem"),
      path.join(root, "services", "utils", "global-bundle.pem")
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { pem: fs.readFileSync(candidate, "utf8"), source: candidate };
    }
  }

  return { pem: null, source: null };
}

function wantsTls(env = process.env) {
  const mode = (env.POSTGRES_SSL_MODE || "").trim().toLowerCase();
  if (mode === "disable") return false;
  if (mode === "require" || mode === "verify") return true;
  return (env.NODE_ENV || "development") === "production";
}

export function buildPostgresSsl(env = process.env) {
  if (!wantsTls(env)) {
    return { dialectOptions: {}, poolSsl: undefined, mode: "off", source: null };
  }

  const rejectFlag = (env.POSTGRES_SSL_REJECT_UNAUTHORIZED || "").trim().toLowerCase();
  const { pem: caPem, source: caSource } = readCaPem(env);

  let rejectUnauthorized = false;
  if (rejectFlag === "true") {
    if (!caPem) {
      throw new Error(
        "POSTGRES_SSL_REJECT_UNAUTHORIZED=true requires a CA bundle (POSTGRES_SSL_CA_PATH or certs/rds-global-bundle.pem)."
      );
    }
    rejectUnauthorized = true;
  } else if (rejectFlag === "false") {
    rejectUnauthorized = false;
  } else if (caPem) {
    rejectUnauthorized = true;
  }

  const ssl =
    caPem && rejectUnauthorized
      ? { require: true, rejectUnauthorized: true, ca: caPem }
      : { require: true, rejectUnauthorized: false };

  const mode = rejectUnauthorized ? "verify" : "encrypt-only";
  return {
    dialectOptions: { ssl },
    poolSsl: ssl,
    mode,
    source: caSource,
  };
}

export function logPostgresSsl(env = process.env) {
  const { mode, source } = buildPostgresSsl(env);
  if (mode === "off") return;
  if (mode === "verify") {
    console.log(`[postgres ssl] Strict TLS verification enabled (${source})`);
    return;
  }
  console.warn(
    "[postgres ssl] TLS encryption without certificate verification. " +
      "Set POSTGRES_SSL_REJECT_UNAUTHORIZED=true for strict mode."
  );
}
