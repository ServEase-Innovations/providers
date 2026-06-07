/**
 * S11 — Strip payment / bank / KYC / direct contact from public provider & customer API responses.
 */

const PROVIDER_PUBLIC_OMIT = new Set([
  "emailId",
  "emailid",
  "mobileNo",
  "mobileno",
  "bankName",
  "accountNumber",
  "ifscCode",
  "upiId",
  "kycNumber",
  "kycImage",
  "idNo",
  "dob",
  "correspondenceAddress",
  "permanentAddress",
  "correspondenceAddressId",
  "permanentAddressId",
  "password",
  "auth0Id",
]);

const CUSTOMER_PUBLIC_OMIT = new Set([
  "emailId",
  "emailid",
  "mobileNo",
  "mobileno",
  "idNo",
  "kycNumber",
  "kycImage",
  "password",
  "auth0Id",
  "street",
  "pinCode",
  "locality",
  "location",
]);

const VENDOR_PUBLIC_OMIT = new Set([
  "emailId",
  "emailid",
  "mobileNo",
  "mobileno",
  "password",
  "auth0Id",
]);

function omitKeys(obj, keys) {
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

/** Customer browsing / booking — no email or phone on provider cards. */
export function redactProviderForDiscovery(provider) {
  return omitKeys(provider, PROVIDER_PUBLIC_OMIT);
}

/** Public provider profile by id (pre-booking). */
export function redactProviderForPublic(provider) {
  return redactProviderForDiscovery(provider);
}

/** Provider registry list — same as public discovery. */
export function redactProviderList(providers) {
  if (!Array.isArray(providers)) return providers;
  return providers.map(redactProviderForPublic);
}

/** Cross-customer list — names only. */
export function redactCustomerForPublic(customer) {
  if (!customer || typeof customer !== "object") return customer;
  const c = omitKeys(customer, CUSTOMER_PUBLIC_OMIT);
  return {
    customerId: c.customerId ?? c.customerid,
    firstname: c.firstname ?? c.firstName,
    lastname: c.lastname ?? c.lastName,
    user_role: c.user_role ?? c.userRole,
  };
}

export function redactCustomerList(customers) {
  if (!Array.isArray(customers)) return customers;
  return customers.map(redactCustomerForPublic);
}

export function redactVendorForPublic(vendor) {
  return omitKeys(vendor, VENDOR_PUBLIC_OMIT);
}
