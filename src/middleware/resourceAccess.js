import { Op } from "sequelize";
import Customer from "../model/customer.model.js";
import Provider from "../model/provider.model.js";
import {
  getCheckJwt,
  hasValidBypassSecret,
  isAuthConfigured,
  isProduction,
} from "./checkJwt.js";
import {
  parseBearerToken,
  verifyServeasoSessionToken,
} from "../utils/sessionToken.js";

export function isReadProtectionEnabled() {
  if (process.env.JWT_PROTECT_READS === "false") return false;
  if (process.env.JWT_PROTECT_READS === "true") return true;
  return isProduction();
}

function emptyActor() {
  return { customerIds: [], providerIds: [], isAdmin: false };
}

function pushId(set, value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0 && !set.includes(n)) set.push(n);
}

function extractEmail(auth) {
  if (!auth || typeof auth !== "object") return null;
  return (
    auth.email ||
    auth["https://serveaso.com/email"] ||
    auth["https://servease.com/email"] ||
    null
  );
}

async function lookupIdsByEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return { customerIds: [], providerIds: [] };

  const [customers, providers] = await Promise.all([
    Customer.findAll({
      where: { emailId: { [Op.iLike]: norm } },
      attributes: ["customerId"],
      raw: true,
    }),
    Provider.findAll({
      where: { emailId: { [Op.iLike]: norm } },
      attributes: ["serviceProviderId"],
      raw: true,
    }),
  ]);

  return {
    customerIds: customers
      .map((r) => Number(r.customerId))
      .filter((n) => n > 0),
    providerIds: providers
      .map((r) => Number(r.serviceProviderId))
      .filter((n) => n > 0),
  };
}

function applySessionClaims(actor, session) {
  if (!session) return;
  if (session.role) actor.role = session.role;
  pushId(actor.customerIds, session.customerId ?? session.customerid);
  pushId(actor.providerIds, session.serviceProviderId ?? session.serviceproviderid);
}

function applyAuth0Claims(actor, auth) {
  if (!auth) return;
  pushId(actor.customerIds, auth.customerId ?? auth.customerid);
  pushId(
    actor.providerIds,
    auth.serviceProviderId ?? auth.serviceproviderid ?? auth.service_provider_id
  );
}

/** Attach actor when Bearer present; never 401 (public profile browsing). */
export function optionalAuthenticateRead(req, res, next) {
  if (!isReadProtectionEnabled()) return next();
  if (hasValidBypassSecret(req)) {
    req.actor = { ...emptyActor(), isAdmin: true };
    return next();
  }

  const bearer = parseBearerToken(req);
  if (!bearer) {
    req.actor = emptyActor();
    return next();
  }

  const session = verifyServeasoSessionToken(bearer);
  if (session) {
    req.actor = emptyActor();
    applySessionClaims(req.actor, session);
    return next();
  }

  const checkJwt = getCheckJwt();
  if (!checkJwt) {
    req.actor = emptyActor();
    return next();
  }

  return checkJwt(req, res, (err) => {
    if (err) {
      req.actor = emptyActor();
      return next();
    }
    return next();
  });
}

export function authenticateRead(req, res, next) {
  if (!isReadProtectionEnabled()) return next();
  if (hasValidBypassSecret(req)) {
    req.actor = { ...emptyActor(), isAdmin: true };
    return next();
  }

  const bearer = parseBearerToken(req);
  if (!bearer) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = verifyServeasoSessionToken(bearer);
  if (session) {
    req.actor = emptyActor();
    applySessionClaims(req.actor, session);
    return next();
  }

  const checkJwt = getCheckJwt();
  if (!checkJwt) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  return checkJwt(req, res, (err) => {
    if (err) return next(err);
    return next();
  });
}

export async function loadActor(req, res, next) {
  if (!isReadProtectionEnabled()) return next();
  if (req.actor?.isAdmin) return next();
  if (!req.actor) req.actor = emptyActor();

  const bearer = parseBearerToken(req);
  const session = bearer ? verifyServeasoSessionToken(bearer) : null;
  if (session) {
    applySessionClaims(req.actor, session);
    return next();
  }

  if (req.auth) {
    applyAuth0Claims(req.actor, req.auth);
    const email = extractEmail(req.auth);
    if (email) {
      const ids = await lookupIdsByEmail(email);
      ids.customerIds.forEach((id) => pushId(req.actor.customerIds, id));
      ids.providerIds.forEach((id) => pushId(req.actor.providerIds, id));
    }
  }

  return next();
}

export function requireAdminRead(req, res, next) {
  if (!isReadProtectionEnabled()) return next();
  if (req.actor?.isAdmin) return next();
  return res.status(403).json({ error: "Forbidden" });
}

export function requireOwnCustomerId(paramName = "id") {
  return (req, res, next) => {
    if (!isReadProtectionEnabled()) return next();
    if (req.actor?.isAdmin) return next();
    const id = Number(req.params[paramName]);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: "Invalid customer id" });
    }
    if (!req.actor?.customerIds?.includes(id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

export function requireOwnProviderId(paramName = "id") {
  return (req, res, next) => {
    if (!isReadProtectionEnabled()) return next();
    if (req.actor?.isAdmin) return next();
    const id = Number(req.params[paramName]);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: "Invalid provider id" });
    }
    if (!req.actor?.providerIds?.includes(id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

export function isProviderOwner(req, providerId) {
  if (!isReadProtectionEnabled()) return true;
  if (req.actor?.isAdmin) return true;
  return req.actor?.providerIds?.includes(Number(providerId)) ?? false;
}

export function isCustomerOwner(req, customerId) {
  if (!isReadProtectionEnabled()) return true;
  if (req.actor?.isAdmin) return true;
  return req.actor?.customerIds?.includes(Number(customerId)) ?? false;
}
