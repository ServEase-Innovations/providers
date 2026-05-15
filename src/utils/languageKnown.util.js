/**
 * DB column `languageknown` is VARCHAR (comma-separated). API uses string[].
 */

/** @param {unknown} value */
export function languageKnownToArray(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

/** @param {unknown} value */
export function languageKnownToDb(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    const parts = value.map((s) => String(s).trim()).filter(Boolean);
    return parts.length ? parts.join(",") : null;
  }
  if (typeof value === "string") {
    const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts.join(",") : null;
  }
  return String(value).trim() || null;
}
