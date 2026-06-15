import { Router } from "express";
import pg from "pg";
import { buildPostgresSsl } from "../config/postgresSsl.js";
import {
  addProvider,
  getPaginatedProviders,
  getProviderById,
  updateProvider,
  deleteProvider,
} from "../controllers/provider.controller.js";
import {
  optionalAuthenticateRead,
  loadActor,
} from "../middleware/resourceAccess.js";
import { languageKnownToArray } from "../utils/languageKnown.util.js";
import { PROVIDER_REGISTRATION_LANGUAGES } from "../constants/providerRegistrationLanguages.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/** Engagements in terminal states must not block provider availability. */
function activeEngagementStatusSql(alias = "e") {
  return `(
    UPPER(COALESCE(${alias}.engagement_status, '')) NOT IN (
      'CANCELLED', 'COMPLETED', 'CLOSED', 'EXPIRED'
    )
    AND UPPER(COALESCE(${alias}.task_status, 'NOT_STARTED')) NOT IN ('CANCELLED', 'COMPLETED')
  )`;
}

const router = Router();
const { Pool } = pg;

/* -------------------- DB -------------------- */
const pgHost = process.env.DB_HOST || process.env.TARGET_DB_HOST || "localhost";
const pgPort = Number(process.env.DB_PORT || process.env.TARGET_DB_PORT || 5432);
const pgUser = process.env.DB_USER || process.env.TARGET_DB_USER || "serveaso";
const pgPassword =
  process.env.DB_PASSWORD || process.env.TARGET_DB_PASSWORD || "serveaso";
const pgDatabase =
  process.env.DB_NAME || process.env.TARGET_DB_NAME || process.env.POSTGRES_DB;

const { poolSsl } = buildPostgresSsl(process.env);

const pool = new Pool({
  host: pgHost,
  user: pgUser,
  password: pgPassword,
  database: pgDatabase,
  port: pgPort,
  ...(poolSsl ? { ssl: poolSsl } : {}),
});

console.log(
  `ℹ️ PG pool target -> host=${pgHost} port=${pgPort} db=${pgDatabase} user=${pgUser}`
);

/* -------------------- HELPERS -------------------- */

// Convert date + time → epoch seconds
function toEpoch(date, time) {
  return epochInIST(date, time);
}

function toFiniteEpoch(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function ymdFromEpoch(epochSeconds) {
  const ep = toFiniteEpoch(epochSeconds);
  if (ep == null) return null;
  return dayjs.unix(ep).tz("Asia/Kolkata").format("YYYY-MM-DD");
}

function hhmmFromEpoch(epochSeconds) {
  const ep = toFiniteEpoch(epochSeconds);
  if (ep == null) return null;
  return dayjs.unix(ep).tz("Asia/Kolkata").format("HH:mm");
}

// Generate hourly availability for a date
function generateHourlyAvailability(timeslot, bookedSlots, date) {
  if (!timeslot) return [];

  // ON_DEMAND blocks full day
  if (bookedSlots.some(b => b.type === "ON_DEMAND")) {
    return [];
  }

  const [workStart, workEnd] = timeslot.split("-");
  const [startH] = workStart.split(":").map(Number);
  const [endH] = workEnd.split(":").map(Number);

  const available = [];

  for (let hour = startH; hour < endH; hour++) {
    const epoch = epochInIST(date, `${String(hour).padStart(2, "0")}:00`);
    const blocked = bookedSlots.some(
      b => epoch < b.end && epoch + 3600 > b.start
    );

    if (!blocked) {
      available.push(`${String(hour).padStart(2, "0")}:00`);
    }
  }

  return available;
}


/* -------------------- SQL -------------------- */

const SQL_QUERY = `SELECT
  pa.serviceproviderid,
  pa.date::date AS date,   -- 🔥 FIX
  pa.slot_start_epoch,
  pa.slot_end_epoch,

  EXISTS (
    SELECT 1
    FROM provider_availability pa2
    JOIN engagements e2
      ON e2.engagement_id = pa2.engagement_id
    WHERE
      pa2.serviceproviderid = pa.serviceproviderid
      AND pa2.date::date = pa.date::date
      AND e2.booking_type = 'ON_DEMAND'
  ) AS has_on_demand

FROM provider_availability pa
WHERE
  pa.serviceproviderid = ANY($1)
  AND pa.date::date BETWEEN $2 AND $3
  AND pa.slot_start_epoch IS NOT NULL
  AND pa.slot_end_epoch IS NOT NULL;
`;


/* -------------------- SWAGGER -------------------- */

/**
 * @swagger
 * /api/service-providers/nearby:
 *   get:
 *     summary: Get nearby available service providers
 *     description: Date and time aware provider discovery
 *     tags:
 *       - Service Providers
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2025-12-27"
 *       - in: query
 *         name: startTime
 *         required: true
 *         schema:
 *           type: string
 *           example: "08:00"
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [COOK, MAID, NANNY]
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *           example: 10
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /api/service-providers/nearby-monthly:
 *   post:
 *     summary: Get nearby service providers with monthly availability analysis
 *     description: >
 *       Returns nearby service providers based on location and role, and
 *       evaluates their availability across a date range (monthly search).
 *       Providers are NOT filtered out if unavailable on some days.
 *       Instead, conflicts and alternate times are returned per provider.
 *       Role matching is case-insensitive on serviceprovider_roles and legacy housekeepingRole.
 *       Booked slots and engagements are filtered by engagements.service_type matching the requested role
 *       (NULL service_type still counts), so multi-role providers get availability for the searched role only.
 *       When customerID is sent, providers you already booked still appear in the list.
 *       Same role as search: EXISTING_CUSTOMER_BOOKING on overlapping days. Different service_type
 *       (e.g. MAID booked, NANNY search): EXISTING_CUSTOMER_OTHER_SERVICE (fullyAvailable false).
 *
 *     tags:
 *       - Service Providers
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 1-based page index. Overrides request body `page` when this query param is sent.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 10
 *         description: Page size (capped at 200). Overrides request body `limit` when this query param is sent.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *               - role
 *               - startDate
 *               - endDate
 *               - preferredStartTime
 *               - serviceDurationMinutes
 *             properties:
 *               lat:
 *                 type: number
 *                 example: 12.903895
 *                 description: User latitude
 *               lng:
 *                 type: number
 *                 example: 77.571541
 *                 description: User longitude
 *               role:
 *                 type: string
 *                 enum: [COOK, MAID, NANNY]
 *                 example: COOK
 *               radius:
 *                 type: number
 *                 example: 10
 *                 description: Search radius in kilometers
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-30"
 *               preferredStartTime:
 *                 type: string
 *                 example: "08:00"
 *                 description: Preferred daily start time
 *               serviceDurationMinutes:
 *                 type: integer
 *                 example: 60
 *                 description: Duration of service per day (in minutes)
 *               customerID:
 *                 type: integer
 *                 description: Optional. Searching customer (maps to engagements.customerid). When set, each provider includes previouslyBooked and previousBookingDetails.
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: 1-based page (optional if using query ?page=)
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 200
 *                 default: 10
 *                 description: Page size, max 200 (optional if using query ?limit=)
 *
 *     responses:
 *       200:
 *         description: Nearby providers with monthly availability summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 4
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceProviderId:
 *                         type: integer
 *                         example: 3403
 *                       firstName:
 *                         type: string
 *                         example: Test
 *                       lastName:
 *                         type: string
 *                         example: Provider
 *                       distanceKm:
 *                         type: number
 *                         example: 0.07
 *                       previouslyBooked:
 *                         type: boolean
 *                         description: Present when customerID was sent; true if this customer had any engagement with this provider.
 *                       previousBookingDetails:
 *                         type: object
 *                         nullable: true
 *                         description: Most recent engagement (by end_date, then created_at) when previouslyBooked is true.
 *                       availabilityFromDb:
 *                         type: object
 *                         description: How weekly hours and booked time were sourced for overlap checks in this date range.
 *                       monthlyAvailability:
 *                         type: object
 *                         properties:
 *                           preferredTime:
 *                             type: string
 *                             example: "08:00"
 *                           fullyAvailable:
 *                             type: boolean
 *                             example: false
 *                           summary:
 *                             type: object
 *                             properties:
 *                               totalDays:
 *                                 type: integer
 *                                 example: 30
 *                               daysAtPreferredTime:
 *                                 type: integer
 *                                 example: 29
 *                               daysWithDifferentTime:
 *                                 type: integer
 *                                 example: 1
 *                               unavailableDays:
 *                                 type: integer
 *                                 example: 0
 *                           exceptions:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 date:
 *                                   type: string
 *                                   format: date
 *                                   example: "2025-12-29"
 *                                 reason:
 *                                   type: string
 *                                   description: >
 *                                     EXISTING_CUSTOMER_BOOKING = same role as search.
 *                                     EXISTING_CUSTOMER_OTHER_SERVICE = active engagement for another service_type with this provider on that day (e.g. MAID booked, NANNY search).
 *                                   enum:
 *                                     - NO_WEEKLY_SLOT_DEFINED
 *                                     - OUTSIDE_WORKING_HOURS
 *                                     - EXISTING_CUSTOMER_BOOKING
 *                                     - EXISTING_CUSTOMER_OTHER_SERVICE
 *                                     - BOOKED
 *                                     - FULLY_BOOKED
 *                                   example: EXISTING_CUSTOMER_OTHER_SERVICE
 *                                 suggestedTime:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "11:00"
 *
 *       400:
 *         description: Missing or invalid request parameters
 *
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
* /api/service-providers/check-email:
*   post:
*     summary: check email existence
*     description: Check if an email already exists in the system
*     tags:
*       - Utility
*     requestBody:
*       required: true
*       content:
*         application/json:
*            schema:
*             type: object
*             required:
*               - email
*             properties:
*               email:
*                 type: string
*                 example: "diyashasingharoy@gmail.com"
*     responses:
*      200:
*         description: Success
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 exists:
*                   type: boolean
*                   example: true
*      400:
*         description: Missing or invalid request parameters *
*      500:
*         description: Internal server error
*/
/**
 * @swagger
* /api/service-providers/check-mobile:
*   post:
*     summary: check mobile existence
*     description: Check if a mobile number already exists in the system
*     tags:
*       - Utility
*     requestBody:
*       required: true
*       content:
*         application/json:
*            schema:
*             type: object
*             required:
*               - mobile
*             properties:
*               mobile:
*                 type: string
*                 example: "1236547854"
*     responses:
*      200:
*         description: Success
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 exists:
*                   type: boolean
*                   example: true
*      400:
*         description: Missing or invalid request parameters *
*      500:
*         description: Internal server error
*/

/* -------------------- ROUTE -------------------- */

router.get("/languages", (_req, res) => {
  res.json({ languages: PROVIDER_REGISTRATION_LANGUAGES });
});

router.get("/nearby", async (req, res) => {
  try {
    let {
      lat,
      lng,
      date,
      date_epoch,
      startTime,
      start_epoch,
      role,
      radius = 10,
    } = req.query;
    const resolvedDate = date || ymdFromEpoch(date_epoch);
    const resolvedStartTime = startTime || hhmmFromEpoch(start_epoch);

    if (!lat || !lng || !resolvedDate || !resolvedStartTime || !role) {
      return res.status(400).json({ message: "Missing required params" });
    }

    lat = Number(lat);
    lng = Number(lng);

    // 🛡 Fix swapped lat/lng automatically
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      [lat, lng] = [lng, lat];
    }

    const startEpoch = toEpoch(resolvedDate, resolvedStartTime);

    const values = [lat, lng, role, resolvedDate, startEpoch, Number(radius)];

    const { rows } = await pool.query(SQL_QUERY, values);

    const providers = rows.map(p => ({
      serviceProviderId: p.serviceProviderId,
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      gender: p.gender,
      housekeepingRole: p.housekeepingRole,
      experience: p.experience,
      rating: p.rating,
      profilePic: p.profilePic,

      locality: p.locality,
      location: p.location,
      pinCode: p.pinCode,

      diet: p.diet,
      cookingSpeciality: p.cookingSpeciality,
      languageKnown: languageKnownToArray(p.languageKnown),

      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm: p.distance_km != null ? Number(p.distance_km.toFixed(2)) : null,

      availableNow: p.available_now,
      nextAvailableEpoch: p.next_available_epoch ? Number(p.next_available_epoch) : null,
      nextAvailableAt:
        p.available_now || !p.next_available_epoch
          ? null
          : new Date(p.next_available_epoch * 1000)
              .toTimeString()
              .slice(0, 5),

      availableTimes: generateHourlyAvailability(
        p.timeslot,
        p.booked_slots,
        resolvedDate
      ),
    }));

    res.json({
      count: providers.length,
      providers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}); 


const TZ_OFFSET = "+05:30";

function epochInIST(dateStr, timeStr) {
  return dayjs
    .tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata")
    .unix();
}

function getDayWindowEpoch(dateStr) {
  return {
    start: epochInIST(dateStr, "00:00"),
    end: epochInIST(dateStr, "23:59")
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function calendarYmdKolkata(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const s = value.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  return dayjs(value).tz("Asia/Kolkata").format("YYYY-MM-DD");
}

function isDateInEngagementVacation(dateYmd, vacationStart, vacationEnd) {
  if (vacationStart == null || vacationEnd == null) return false;
  const d = calendarYmdKolkata(dateYmd);
  const a = calendarYmdKolkata(vacationStart);
  const b = calendarYmdKolkata(vacationEnd);
  if (!d || !a || !b) return false;
  return d >= a && d <= b;
}

function dateRangesOverlapYmd(rangeAStart, rangeAEnd, rangeBStart, rangeBEnd) {
  const a0 = calendarYmdKolkata(rangeAStart);
  const a1 = calendarYmdKolkata(rangeAEnd);
  const b0 = calendarYmdKolkata(rangeBStart);
  const b1 = calendarYmdKolkata(rangeBEnd);
  if (!a0 || !a1 || !b0 || !b1) return false;
  return a0 <= b1 && b0 <= a1;
}

function buildVacationAvailabilityPayload(row, searchStart, searchEnd) {
  const vacationStartDate = calendarYmdKolkata(row.vacation_start_date);
  const vacationEndDate = calendarYmdKolkata(row.vacation_end_date);
  if (!vacationStartDate || !vacationEndDate) return null;
  const leaveDays = Number(row.leave_days) || 0;
  if (leaveDays <= 0) return null;
  return {
    status: "ACTIVE",
    engagementId: row.engagement_id != null ? String(row.engagement_id) : null,
    leaveDays,
    vacationStartDate,
    vacationEndDate,
    engagementStartDate: calendarYmdKolkata(row.start_date),
    engagementEndDate: calendarYmdKolkata(row.end_date),
    overlapsSearchWindow: dateRangesOverlapYmd(
      vacationStartDate,
      vacationEndDate,
      searchStart,
      searchEnd
    ),
  };
}

async function fetchActiveVacationByProvider(providerIds) {
  if (!providerIds?.length) return new Map();
  const res = await pool.query(
    `
    SELECT DISTINCT ON (e.serviceproviderid)
      e.serviceproviderid,
      e.engagement_id,
      e.leave_days,
      e.vacation_start_date,
      e.vacation_end_date,
      e.start_date,
      e.end_date
    FROM engagements e
    WHERE e.serviceproviderid = ANY($1::bigint[])
      AND e.active = true
      AND COALESCE(e.leave_days, 0) > 0
      AND e.vacation_start_date IS NOT NULL
      AND e.vacation_end_date IS NOT NULL
      AND UPPER(COALESCE(e.engagement_status, '')) NOT IN (
        'CANCELLED', 'COMPLETED', 'CLOSED', 'EXPIRED'
      )
      AND UPPER(COALESCE(e.task_status, 'NOT_STARTED')) NOT IN (
        'CANCELLED', 'COMPLETED'
      )
    ORDER BY
      e.serviceproviderid,
      e.end_date DESC NULLS LAST,
      e.created_at DESC NULLS LAST
    `,
    [providerIds]
  );
  const map = new Map();
  for (const row of res.rows) {
    map.set(String(row.serviceproviderid), row);
  }
  return map;
}

function rolesMatchForSearch(serviceType, roleNorm) {
  const service = String(serviceType ?? "").trim().toLowerCase();
  const role = String(roleNorm ?? "").trim().toLowerCase();
  if (!service || !role) return true;
  if (service === role) return true;
  if (service.includes("cook") && role.includes("cook")) return true;
  if (service.includes("maid") && role.includes("maid")) return true;
  if (service.includes("nanny") && role.includes("nanny")) return true;
  return false;
}

function isActiveBlockingEngagement(prev) {
  if (!prev || prev.active === false) return false;
  const life = String(prev.engagementStatus ?? "").toUpperCase();
  const task = String(prev.taskStatus ?? "NOT_STARTED").toUpperCase();
  if (["CANCELLED", "COMPLETED", "CLOSED", "EXPIRED"].includes(life)) {
    return false;
  }
  if (["CANCELLED", "COMPLETED"].includes(task)) return false;
  return true;
}

/** Date overlap alone is not enough — only block when visit times collide (non-vacation days). */
function customerHasSchedulableConflict(
  prev,
  rangeStartStr,
  rangeEndStr,
  preferredTime,
  durationSec,
  roleNorm
) {
  if (!isActiveBlockingEngagement(prev)) return false;
  if (!rolesMatchForSearch(prev.serviceType, roleNorm)) return false;
  if (!engagementOverlapsSearchWindow(prev, rangeStartStr, rangeEndStr)) {
    return false;
  }

  const startEp = Number(prev.startEpoch);
  let visitTimeStr;
  if (Number.isFinite(startEp)) {
    visitTimeStr = dayjs.unix(startEp).tz("Asia/Kolkata").format("HH:mm");
  } else if (prev.startDate != null) {
    visitTimeStr = dayjs(prev.startDate).tz("Asia/Kolkata").format("HH:mm");
  } else {
    return true;
  }

  let visitDurSec = durationSec;
  const dm = prev.durationMinutes;
  if (dm != null && dm >= 1 && dm <= 24 * 60) {
    visitDurSec = dm * 60;
  }

  const rangeStart = dayjs
    .tz(rangeStartStr, "YYYY-MM-DD", "Asia/Kolkata")
    .startOf("day");
  const rangeEnd = dayjs.tz(rangeEndStr, "YYYY-MM-DD", "Asia/Kolkata").startOf(
    "day"
  );
  const engStart = dayjs(prev.startDate).tz("Asia/Kolkata").startOf("day");
  const engEnd = dayjs(prev.endDate).tz("Asia/Kolkata").startOf("day");
  const from = engStart.isAfter(rangeStart) ? engStart : rangeStart;
  const to = engEnd.isBefore(rangeEnd) ? engEnd : rangeEnd;

  for (let c = from.clone(); !c.isAfter(to, "day"); c = c.add(1, "day")) {
    const dateStr = c.format("YYYY-MM-DD");
    if (
      isDateInEngagementVacation(
        dateStr,
        prev.vacationStartDate,
        prev.vacationEndDate
      )
    ) {
      continue;
    }
    const prefStart = epochInIST(dateStr, preferredTime);
    const prefEnd = prefStart + durationSec;
    const visitStart = epochInIST(dateStr, visitTimeStr);
    const visitEnd = visitStart + visitDurSec;
    if (overlaps(prefStart, prefEnd, visitStart, visitEnd)) {
      return true;
    }
  }
  return false;
}

/**
 * Daily busy intervals from this customer's existing engagement with this provider,
 * intersected with the search range. Ensures overlap checks match the booked wall-clock
 * window when provider_availability rows use month-spanning epochs that normalize away
 * from the preferred slot.
 */
function previousEngagementBusyIntervals(
  prev,
  rangeStartStr,
  rangeEndStr,
  roleNorm,
  fallbackDurationSec
) {
  if (!isActiveBlockingEngagement(prev)) return [];
  if (!rolesMatchForSearch(prev.serviceType, roleNorm)) return [];

  const startEp = Number(prev.startEpoch);
  let timeStr;
  if (Number.isFinite(startEp)) {
    timeStr = dayjs.unix(startEp).tz("Asia/Kolkata").format("HH:mm");
  } else if (prev.startDate != null) {
    timeStr = dayjs(prev.startDate).tz("Asia/Kolkata").format("HH:mm");
  } else {
    return [];
  }
  let blockDurSec = fallbackDurationSec;
  const dm = prev.durationMinutes;
  if (dm != null && dm >= 1 && dm <= 24 * 60) {
    blockDurSec = dm * 60;
  }

  const engStart = dayjs(prev.startDate).tz("Asia/Kolkata").startOf("day");
  const engEnd = dayjs(prev.endDate).tz("Asia/Kolkata").startOf("day");
  const reqStart = dayjs.tz(rangeStartStr, "YYYY-MM-DD", "Asia/Kolkata").startOf("day");
  const reqEnd = dayjs.tz(rangeEndStr, "YYYY-MM-DD", "Asia/Kolkata").startOf("day");

  if (engEnd.isBefore(reqStart, "day") || engStart.isAfter(reqEnd, "day")) {
    return [];
  }

  const from = engStart.isAfter(reqStart) ? engStart : reqStart;
  const to = engEnd.isBefore(reqEnd) ? engEnd : reqEnd;

  const out = [];
  let cursor = from.clone();
  while (!cursor.isAfter(to, "day")) {
    const dateStr = cursor.format("YYYY-MM-DD");
    if (
      isDateInEngagementVacation(
        dateStr,
        prev.vacationStartDate,
        prev.vacationEndDate
      )
    ) {
      cursor = cursor.add(1, "day");
      continue;
    }
    const blockStart = epochInIST(dateStr, timeStr);
    const blockEnd = blockStart + blockDurSec;
    out.push({
      slot_start_epoch: blockStart,
      slot_end_epoch: blockEnd,
      _fromCustomerPriorEngagement: true,
    });
    cursor = cursor.add(1, "day");
  }
  return out;
}

function engagementOverlapsSearchWindow(prev, rangeStartStr, rangeEndStr) {
  if (!prev || prev.active === false) return false;
  const engStart = dayjs(prev.startDate).tz("Asia/Kolkata").startOf("day");
  const engEnd = dayjs(prev.endDate).tz("Asia/Kolkata").startOf("day");
  const reqStart = dayjs.tz(rangeStartStr, "YYYY-MM-DD", "Asia/Kolkata").startOf(
    "day"
  );
  const reqEnd = dayjs.tz(rangeEndStr, "YYYY-MM-DD", "Asia/Kolkata").startOf(
    "day"
  );
  return (
    !engEnd.isBefore(reqStart, "day") && !engStart.isAfter(reqEnd, "day")
  );
}

function calendarDayInPriorEngagement(prev, dateStr) {
  if (!prev) return false;
  const d = dayjs.tz(dateStr, "YYYY-MM-DD", "Asia/Kolkata").startOf("day");
  const engStart = dayjs(prev.startDate).tz("Asia/Kolkata").startOf("day");
  const engEnd = dayjs(prev.endDate).tz("Asia/Kolkata").startOf("day");
  return !d.isBefore(engStart, "day") && !d.isAfter(engEnd, "day");
}

/**
 * Some monthly bookings store slot_start/slot_end as the full engagement range on every
 * provider_availability row. That makes any preferred time look blocked. Collapse to one
 * interval on the row's calendar date (IST) using wall-clock from start_epoch and a sane
 * duration (from engagement when <= 24h, else 60 minutes).
 */
function normalizeProviderAvailabilityBookedSlot(
  dateStr,
  startEpoch,
  endEpoch,
  engagementDurationMinutes
) {
  const start = Number(startEpoch);
  const end = Number(endEpoch);
  if (!(start < end)) return null;

  const span = end - start;
  const dayStart = epochInIST(dateStr, "00:00");
  const dayEnd = dayStart + 86400;

  let durSec =
    engagementDurationMinutes != null &&
    engagementDurationMinutes >= 1 &&
    engagementDurationMinutes <= 24 * 60
      ? engagementDurationMinutes * 60
      : 3600;

  if (span > 2 * 86400) {
    const wall = dayjs.unix(start).tz("Asia/Kolkata").format("HH:mm");
    const blockStart = epochInIST(dateStr, wall);
    const blockEnd = blockStart + durSec;
    const clipStart = Math.max(blockStart, dayStart);
    const clipEnd = Math.min(blockEnd, dayEnd);
    if (clipEnd > clipStart) {
      return { slot_start_epoch: clipStart, slot_end_epoch: clipEnd };
    }
    return null;
  }

  const i0 = Math.max(start, dayStart);
  const i1 = Math.min(end, dayEnd);
  if (i1 > i0) return { slot_start_epoch: i0, slot_end_epoch: i1 };
  return null;
}

/** pg TIME / string → HH:mm for epochInIST */
function normalizeTimeForEpoch(t) {
  if (t == null) return "00:00";
  if (t instanceof Date) {
    return `${String(t.getUTCHours()).padStart(2, "0")}:${String(
      t.getUTCMinutes()
    ).padStart(2, "0")}`;
  }
  const s = String(t).trim();
  if (/^\d{1,2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  return s.slice(0, 5);
}

/**
 * Same shape as provider_weekly_slots rows (day_of_week 0–6 Sun–Sat, HH:mm).
 * Mirrors onboarding convertTimeslotString: each range applies to every weekday.
 */
function weeklySlotsFromTimeslotString(timeslot) {
  if (!timeslot || typeof timeslot !== "string") return [];
  const ranges = timeslot.split(",");
  const slots = [];
  for (let day = 0; day <= 6; day++) {
    for (const range of ranges) {
      const [start, end] = range.trim().split("-");
      if (!start || !end || start.trim() >= end.trim()) continue;
      slots.push({
        day_of_week: day,
        slot_start: start.trim().slice(0, 5),
        slot_end: end.trim().slice(0, 5)
      });
    }
  }
  return slots;
}

function isValidISODate(dateStr) {
  if (typeof dateStr !== "string") return false;
  return dayjs(dateStr, "YYYY-MM-DD", true).isValid();
}

function isValidTimeHHmm(timeStr) {
  if (typeof timeStr !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);
}

/** Max rows per page for /nearby-monthly (query or body `limit`). */
const NEARBY_MONTHLY_PAGE_LIMIT_MAX = 200;

/**
 * `page` / `limit` from query string override the same keys in the JSON body when present.
 */
function parseNearbyMonthlyPagination(query, body) {
  const q = query || {};
  const b = body || {};
  const hasQueryPage =
    q.page != null && String(q.page).trim() !== "";
  const hasQueryLimit =
    q.limit != null && String(q.limit).trim() !== "";
  const rawPage = hasQueryPage ? q.page : b.page;
  const rawLimit = hasQueryLimit ? q.limit : b.limit;

  let page = Number(rawPage);
  if (!Number.isFinite(page) || page < 1) page = 1;
  page = Math.floor(page);

  let limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  limit = Math.min(NEARBY_MONTHLY_PAGE_LIMIT_MAX, Math.floor(limit));

  return { page, limit };
}

const getAge = (dobString) =>{
      const today = new Date();
  const dob = new Date(dobString);

  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  console.log(`Calculated age for DOB ${dobString}: ${age}`);
  return age;
    }




class NearbyMonthlyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.body = { message };
  }
}

async function runNearbyMonthlyDiscovery(bInput, qInput) {
    const b = bInput || {};
    const q = qInput || {};
    const {
      lat,
      lng,
      role,
      radius = 10,
      startDate: startDateRaw,
      endDate: endDateRaw,
      start_date_epoch,
      end_date_epoch,
      preferredStartTime: preferredStartTimeRaw,
      preferred_start_epoch,
      serviceDurationMinutes
    } = b;
    const startDate = startDateRaw || ymdFromEpoch(start_date_epoch);
    const endDate = endDateRaw || ymdFromEpoch(end_date_epoch);
    const preferredStartTime =
      preferredStartTimeRaw || hhmmFromEpoch(preferred_start_epoch);
    const customerID = b.customerID ?? q.customerID;
    const customerId = b.customerId ?? q.customerId;
    const excludeEngagementIdRaw =
      b.excludeEngagementId ?? b.exclude_engagement_id ?? null;
    const excludeEngagementId =
      excludeEngagementIdRaw != null && String(excludeEngagementIdRaw).trim() !== ""
        ? String(excludeEngagementIdRaw).trim()
        : null;

    const { page, limit } = parseNearbyMonthlyPagination(q, b);

    if (
      !lat ||
      !lng ||
      !role ||
      !startDate ||
      !endDate ||
      !preferredStartTime ||
      !serviceDurationMinutes
    ) {
      throw new NearbyMonthlyError(400, "Missing required fields");
    }

    if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
      throw new NearbyMonthlyError(
        400,
        "Invalid date format. Use YYYY-MM-DD for startDate and endDate."
      );
    }

    if (!isValidTimeHHmm(preferredStartTime)) {
      throw new NearbyMonthlyError(
        400,
        "Invalid preferredStartTime. Use HH:mm (24-hour), e.g. 08:00."
      );
    }

    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      throw new NearbyMonthlyError(400, "endDate must be on/after startDate.");
    }

    const roleSearchNorm = String(role).trim();

    let latNum = Number(lat);
    let lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new NearbyMonthlyError(
        400,
        "Invalid lat/lng. Send finite numbers (e.g. customer latitude/longitude)."
      );
    }
    if (Math.abs(latNum) > 90 && Math.abs(lngNum) <= 90) {
      [latNum, lngNum] = [lngNum, latNum];
    }

    const customerIdInput = customerID ?? customerId;
    const customerIdRaw =
      customerIdInput != null && customerIdInput !== ""
        ? Number(customerIdInput)
        : null;
    const hasCustomerID =
      customerIdRaw != null && !Number.isNaN(customerIdRaw);

    const serviceProviderIdFilter = (() => {
      const raw = b.serviceProviderId ?? b.serviceproviderid;
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

     /* ---------- STEP 1: Nearby Providers WITH optional filters ---------- */

const {
  experienceRange,
  minRating,
  gender,
  diet,
  languages
} = b;

const filterQuery = `
AND ($5::text IS NULL OR sp.experience BETWEEN split_part($5::text, '-', 1)::int AND split_part($5::text, '-', 2)::int)
AND ($6::numeric IS NULL OR sp.rating >= $6::numeric)
AND ($7::text IS NULL OR LOWER(sp.gender) = LOWER($7::text))
AND ($8::text IS NULL OR LOWER(sp.diet) = LOWER($8::text))
AND (
  $9::text[] IS NULL OR EXISTS (
    SELECT 1
    FROM unnest($9::text[]) AS lang
    WHERE LOWER(COALESCE(sp.languageknown::text, '')) LIKE '%' || LOWER(lang) || '%'
  )
)
`;
    /* ---------- STEP 1: Nearby Providers ---------- */
    const providersRes = await pool.query(
      `

      SELECT
        sp.serviceproviderid AS "serviceProviderId",
        sp.firstname AS "firstName",
        sp.middlename AS "middleName",
        sp.lastname AS "lastName",
        sp.gender,
        sp.experience,
        sp.rating,
        sp.profilepic AS "profilePic",
        sp.mobileno AS "mobileNo",
        sp.emailid AS "emailId",
        sp.diet,
        sp.cookingspeciality AS "cookingSpeciality",
        sp.languageknown AS "languageKnown",
        sp.locality,
        sp.location,
        sp.pincode AS "pinCode",
        sp.latitude,
        sp.longitude,
        sp.dob,
        sp.timeslot,
        sp.housekeepingrole AS "housekeepingRole",
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(sp.latitude)) *
            cos(radians(sp.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(sp.latitude))
          )
        ) AS distance_km
      FROM serviceprovider sp
      WHERE sp.isactive = true
        AND (
          EXISTS (
            SELECT 1
            FROM serviceprovider_roles r
            WHERE r.serviceproviderid = sp.serviceproviderid
              AND LOWER(TRIM(r.role::text)) = LOWER(TRIM($3::text))
          )
          OR (
            NOT EXISTS (
              SELECT 1
              FROM serviceprovider_roles r2
              WHERE r2.serviceproviderid = sp.serviceproviderid
            )
            AND LOWER(TRIM(COALESCE(sp.housekeepingrole, ''::text))) = LOWER(TRIM($3::text))
          )
          OR (
            LOWER(TRIM(COALESCE(sp.housekeepingrole, ''::text))) = LOWER(TRIM($3::text))
            AND NOT EXISTS (
              SELECT 1
              FROM serviceprovider_roles r3
              WHERE r3.serviceproviderid = sp.serviceproviderid
                AND LOWER(TRIM(r3.role::text)) = LOWER(TRIM($3::text))
            )
          )
        )
        AND (
          ($10::bigint IS NOT NULL AND sp.serviceproviderid = $10::bigint)
          OR (
            $10::bigint IS NULL
            AND (
              6371 * acos(
                cos(radians($1)) * cos(radians(sp.latitude)) *
                cos(radians(sp.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(sp.latitude))
              )
            ) <= $4
          )
        )

        ${filterQuery}
          
      ORDER BY distance_km ASC
      `,
      // [lat, lng, roleSearchNorm, radius]
[
  latNum,                     // $1
  lngNum,                     // $2
  roleSearchNorm,          // $3
  radius,                  // $4
  experienceRange ?? null,   // $5
  minRating ?? null,       // $6
  gender ?? null,          // $7
  diet ?? null,            // $8
  (languages?.length ? languages : null), // $9
  serviceProviderIdFilter // $10
]
    );

    if (!providersRes.rows.length) {
      return { count: 0, page, limit, providers: [] };
    }

    const providerIds = providersRes.rows.map((p) => p.serviceProviderId);
    const activeVacationByProvider = await fetchActiveVacationByProvider(providerIds);

    const rolesRes = await pool.query(
      `
      SELECT serviceproviderid AS "serviceProviderId", role
      FROM serviceprovider_roles
      WHERE serviceproviderid = ANY($1::bigint[])
      ORDER BY role
      `,
      [providerIds]
    );
    const rolesBySpId = {};
    for (const row of rolesRes.rows) {
      const id = String(row.serviceProviderId);
      rolesBySpId[id] ??= [];
      if (row.role != null && String(row.role).trim() !== "") {
        rolesBySpId[id].push(String(row.role).trim());
      }
    }

    /* ---------- Previous bookings for this customer (optional) ---------- */
    let previousBookingByProvider = new Map();
    if (hasCustomerID) {
      const prevRes = await pool.query(
        `
        SELECT DISTINCT ON (e."serviceproviderid")
          e."engagement_id" AS "engagementId",
          e."serviceproviderid" AS "serviceProviderId",
          e."booking_type" AS "bookingType",
          e."service_type" AS "serviceType",
          e."start_date" AS "startDate",
          e."end_date" AS "endDate",
          e."start_epoch" AS "startEpoch",
          e."duration_minutes" AS "durationMinutes",
          e."vacation_start_date" AS "vacationStartDate",
          e."vacation_end_date" AS "vacationEndDate",
          e."leave_days" AS "leaveDays",
          e."engagement_status" AS "engagementStatus",
          e."assignment_status" AS "assignmentStatus",
          e."task_status" AS "taskStatus",
          e."active" AS "active",
          e."base_amount" AS "baseAmount",
          e."created_at" AS "createdAt"
        FROM engagements e
        WHERE e."customerid" = $1
          AND e."serviceproviderid" = ANY($2::bigint[])
          AND e.active = true
          AND UPPER(COALESCE(e.engagement_status, '')) NOT IN (
            'CANCELLED', 'COMPLETED', 'CLOSED', 'EXPIRED'
          )
          AND UPPER(COALESCE(e.task_status, 'NOT_STARTED')) NOT IN (
            'CANCELLED', 'COMPLETED'
          )
        ORDER BY
          e."serviceproviderid",
          e."end_date" DESC NULLS LAST,
          e."created_at" DESC NULLS LAST
        `,
        [customerIdRaw, providerIds]
      );
      for (const row of prevRes.rows) {
        const id = String(row.serviceProviderId);
        previousBookingByProvider.set(id, {
          engagementId: row.engagementId != null ? String(row.engagementId) : null,
          bookingType: row.bookingType,
          serviceType: row.serviceType,
          startDate: row.startDate,
          endDate: row.endDate,
          startDateEpoch: row.startDate
            ? dayjs.tz(row.startDate, "Asia/Kolkata").startOf("day").unix()
            : null,
          endDateEpoch: row.endDate
            ? dayjs.tz(row.endDate, "Asia/Kolkata").endOf("day").unix()
            : null,
          startEpoch: row.startEpoch != null ? Number(row.startEpoch) : null,
          durationMinutes:
            row.durationMinutes != null ? Number(row.durationMinutes) : null,
          vacationStartDate: row.vacationStartDate,
          vacationEndDate: row.vacationEndDate,
          leaveDays: row.leaveDays != null ? Number(row.leaveDays) : 0,
          engagementStatus: row.engagementStatus,
          assignmentStatus: row.assignmentStatus,
          taskStatus: row.taskStatus,
          active: row.active,
          baseAmount: row.baseAmount != null ? Number(row.baseAmount) : null,
          createdAt: row.createdAt,
          createdAtEpoch: row.createdAt
            ? dayjs(row.createdAt).unix()
            : null
        });
      }
    }

    /* ---------- STEP 2: Fetch Weekly Slots ---------- */
    const weeklySlotsRes = await pool.query(
      `
      SELECT serviceproviderid AS "serviceProviderId", day_of_week, slot_start, slot_end
      FROM provider_weekly_slots
      WHERE serviceproviderid = ANY($1)
      `,
      [providerIds]
    );

    const weeklySlotsByProvider = {};
    /** @type {Record<string, 'provider_weekly_slots' | 'timeslot' | 'none'>} */
    const weeklySlotSourceByProvider = {};
    for (const row of weeklySlotsRes.rows) {
      const sid = String(row.serviceProviderId);
      weeklySlotSourceByProvider[sid] = "provider_weekly_slots";
      weeklySlotsByProvider[sid] ??= [];
      weeklySlotsByProvider[sid].push({
        day_of_week: Number(row.day_of_week),
        slot_start: normalizeTimeForEpoch(row.slot_start),
        slot_end: normalizeTimeForEpoch(row.slot_end),
      });
    }

    for (const p of providersRes.rows) {
      const id = String(p.serviceProviderId);
      const existing = weeklySlotsByProvider[id];
      if (!existing || existing.length === 0) {
        const derived = weeklySlotsFromTimeslotString(p.timeslot);
        if (derived.length > 0) {
          weeklySlotsByProvider[id] = derived;
          weeklySlotSourceByProvider[id] = "timeslot";
        }
      }
    }

    for (const p of providersRes.rows) {
      const id = String(p.serviceProviderId);
      const slots = weeklySlotsByProvider[id];
      if (!weeklySlotSourceByProvider[id]) {
        weeklySlotSourceByProvider[id] =
          slots && slots.length > 0 ? "provider_weekly_slots" : "none";
      }
    }

    /* ---------- STEP 3: Fetch Bookings ---------- */
    const bookingsRes = await pool.query(
      `
      SELECT
        pa.serviceproviderid AS "serviceProviderId",
        pa.date::text AS "dateStr",
        pa.slot_start_epoch,
        pa.slot_end_epoch,
        pa.engagement_id AS "engagementId",
        e.duration_minutes AS "engagementDurationMinutes"
      FROM provider_availability pa
      INNER JOIN engagements e ON e.engagement_id = pa.engagement_id
      WHERE
        pa.serviceproviderid = ANY($1)
        AND pa.status = 'BOOKED'
        AND pa.date BETWEEN $2::date AND $3::date
        AND pa.slot_start_epoch IS NOT NULL
        AND pa.slot_end_epoch IS NOT NULL
        AND e.active = true
        AND ${activeEngagementStatusSql("e")}
      `,
      [providerIds, startDate, endDate]
    );

    const paFreeRes = await pool.query(
      `
      SELECT
        pa.serviceproviderid AS "serviceProviderId",
        pa.engagement_id,
        pa.date::text AS "dateStr"
      FROM provider_availability pa
      WHERE
        pa.serviceproviderid = ANY($1)
        AND LOWER(TRIM(COALESCE(pa.status::text, ''))) = 'free'
        AND pa.date BETWEEN $2::date AND $3::date
        AND pa.engagement_id IS NOT NULL
      `,
      [providerIds, startDate, endDate]
    );

    /* ---------- Fallback: Engagements (in case provider_availability not populated) ---------- */
    const engagementsRes = await pool.query(
      `
      SELECT
        e.serviceproviderid AS "serviceProviderId",
        e.engagement_id AS "engagementId",
        e.booking_type,
        e.start_date,
        e.end_date,
        e.start_epoch,
        e.end_epoch,
        e.duration_minutes,
        e.vacation_start_date,
        e.vacation_end_date
      FROM engagements e
      WHERE
        e.serviceproviderid = ANY($1)
        AND e.serviceproviderid IS NOT NULL
        AND e.active = true
        AND e.start_date <= $3::date
        AND e.end_date >= $2::date
        AND e.booking_type IN ('MONTHLY', 'SHORT_TERM', 'ON_DEMAND')
        AND ${activeEngagementStatusSql("e")}
        AND (
          e.service_type IS NULL
          OR LOWER(TRIM(e.service_type::text)) = LOWER(TRIM($4::text))
        )
      `,
      [providerIds, startDate, endDate, roleSearchNorm]
    );

    const paFreeBySpAndCalendarDate = new Set();
    for (const f of paFreeRes.rows) {
      const d = f.dateStr.trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      paFreeBySpAndCalendarDate.add(`${String(f.serviceProviderId)}:${d}`);
    }
    const engagementVacationBySpAndDate = new Set();
    {
      const r0 = dayjs
        .tz(calendarYmdKolkata(startDate), "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");
      const r1 = dayjs
        .tz(calendarYmdKolkata(endDate), "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");
      for (const e0 of engagementsRes.rows) {
        if (e0.booking_type === "ON_DEMAND") continue;
        const sp0 = String(e0.serviceProviderId);
        for (
          let c = r0.clone();
          !c.isAfter(r1, "day");
          c = c.add(1, "day")
        ) {
          const ds = c.format("YYYY-MM-DD");
          if (
            isDateInEngagementVacation(
              ds,
              e0.vacation_start_date,
              e0.vacation_end_date
            )
          ) {
            engagementVacationBySpAndDate.add(`${sp0}:${ds}`);
          }
        }
      }
    }
    const spDayClearedForVisit = new Set();
    for (const k of paFreeBySpAndCalendarDate) {
      spDayClearedForVisit.add(k);
    }
    for (const k of engagementVacationBySpAndDate) {
      spDayClearedForVisit.add(k);
    }

    const bookingsByProvider = {};
    const paBookedCountBySp = {};
    const providersWithPaBookedRows = new Set();
    for (const b of bookingsRes.rows) {
      if (
        excludeEngagementId &&
        b.engagementId != null &&
        String(b.engagementId) === excludeEngagementId
      ) {
        continue;
      }
      const spid = String(b.serviceProviderId);
      providersWithPaBookedRows.add(spid);
      paBookedCountBySp[spid] = (paBookedCountBySp[spid] || 0) + 1;
      const normalized = normalizeProviderAvailabilityBookedSlot(
        b.dateStr,
        b.slot_start_epoch,
        b.slot_end_epoch,
        b.engagementDurationMinutes != null
          ? Number(b.engagementDurationMinutes)
          : null
      );
      if (!normalized) continue;
      if (hasCustomerID) {
        const prevRow = previousBookingByProvider.get(spid);
        const ownEngId =
          prevRow?.engagementId != null
            ? String(prevRow.engagementId)
            : null;
        if (
          ownEngId != null &&
          b.engagementId != null &&
          String(b.engagementId) === ownEngId
        ) {
          normalized._customerOwnPa = true;
        }
      }
      bookingsByProvider[spid] ??= [];
      bookingsByProvider[spid].push(normalized);
    }

    const engMonthlyShortTermBySp = {};
    const engOnDemandBySp = {};

    for (const e of engagementsRes.rows) {
      if (
        excludeEngagementId &&
        e.engagementId != null &&
        String(e.engagementId) === excludeEngagementId
      ) {
        continue;
      }
      const spid = String(e.serviceProviderId);

      if (e.booking_type === "ON_DEMAND") {
        engOnDemandBySp[spid] = (engOnDemandBySp[spid] || 0) + 1;
        const ss = Number(e.start_epoch);
        const ee = Number(e.end_epoch);
        if (!Number.isNaN(ss) && !Number.isNaN(ee) && ee > ss) {
          bookingsByProvider[spid] ??= [];
          bookingsByProvider[spid].push({
            slot_start_epoch: ss,
            slot_end_epoch: ee
          });
        }
        continue;
      }

      if (providersWithPaBookedRows.has(spid)) {
        continue;
      }

      engMonthlyShortTermBySp[spid] = (engMonthlyShortTermBySp[spid] || 0) + 1;
      const timeStr = dayjs
        .unix(Number(e.start_epoch))
        .tz("Asia/Kolkata")
        .format("HH:mm");
      const durMin =
        e.duration_minutes != null &&
        e.duration_minutes >= 1 &&
        e.duration_minutes <= 24 * 60
          ? e.duration_minutes
          : 60;
      const durationSec = durMin * 60;
      const engStart = dayjs(e.start_date).tz("Asia/Kolkata").startOf("day");
      const engEnd = dayjs(e.end_date).tz("Asia/Kolkata").startOf("day");
      const rangeStart = dayjs
        .tz(startDate, "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");
      const rangeEnd = dayjs
        .tz(endDate, "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");
      const fromDay = engStart.isAfter(rangeStart) ? engStart : rangeStart;
      const toDay = engEnd.isBefore(rangeEnd) ? engEnd : rangeEnd;

      let cursor = fromDay.clone();
      while (!cursor.isAfter(toDay, "day")) {
        const dateStr = cursor.format("YYYY-MM-DD");
        if (
          isDateInEngagementVacation(
            dateStr,
            e.vacation_start_date,
            e.vacation_end_date
          )
        ) {
          cursor = cursor.add(1, "day");
          continue;
        }
        const slotStart = epochInIST(dateStr, timeStr);
        const slotEnd = slotStart + durationSec;

        bookingsByProvider[spid] ??= [];
        const mergedSlot = {
          slot_start_epoch: slotStart,
          slot_end_epoch: slotEnd
        };
        if (hasCustomerID) {
          const prevRow = previousBookingByProvider.get(spid);
          const ownEngId =
            prevRow?.engagementId != null
              ? String(prevRow.engagementId)
              : null;
          if (
            ownEngId != null &&
            e.engagementId != null &&
            String(e.engagementId) === ownEngId
          ) {
            mergedSlot._customerOwnEngagementFallback = true;
          }
        }
        bookingsByProvider[spid].push(mergedSlot);
        cursor = cursor.add(1, "day");
      }
    }

    /* ---------- STEP 4: Monthly Evaluation ---------- */
    const durationSec = serviceDurationMinutes * 60;
    const evaluatedProviders = [];

    for (const p of providersRes.rows) {
      const pidKey = String(p.serviceProviderId);
      const providerWeeklySlots = weeklySlotsByProvider[pidKey] || [];

      const baseBookings = bookingsByProvider[pidKey] || [];
      const prevForSp = hasCustomerID
        ? previousBookingByProvider.get(pidKey)
        : null;
      const prevForAvailability =
        excludeEngagementId &&
        prevForSp?.engagementId != null &&
        String(prevForSp.engagementId) === excludeEngagementId
          ? null
          : prevForSp;

      const fromPrevEngagement = previousEngagementBusyIntervals(
        prevForAvailability,
        startDate,
        endDate,
        roleSearchNorm,
        durationSec
      );
      let providerBookingsMerged = [...baseBookings, ...fromPrevEngagement];
      if (spDayClearedForVisit.size) {
        providerBookingsMerged = providerBookingsMerged.filter((b) => {
          const t = Number(b.slot_start_epoch);
          if (!Number.isFinite(t)) return true;
          const dKey = dayjs.unix(t).tz("Asia/Kolkata").format("YYYY-MM-DD");
          return !spDayClearedForVisit.has(`${pidKey}:${dKey}`);
        });
      }

      let totalDays = 0;
      let daysAtPreferredTime = 0;
      let daysWithDifferentTime = 0;
      let unavailableDays = 0;
      const exceptions = [];

      const rangeEvalStart = dayjs
        .tz(calendarYmdKolkata(startDate), "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");
      const rangeEvalEnd = dayjs
        .tz(calendarYmdKolkata(endDate), "YYYY-MM-DD", "Asia/Kolkata")
        .startOf("day");

      for (
        let evDay = rangeEvalStart.clone();
        !evDay.isAfter(rangeEvalEnd, "day");
        evDay = evDay.add(1, "day")
      ) {
        totalDays++;

        const dateStr = evDay.format("YYYY-MM-DD");
        const dow = evDay.day();

        const todaysSlots = providerWeeklySlots.filter(
          s => s.day_of_week === dow
        );

        if (!todaysSlots.length) {
          unavailableDays++;
          exceptions.push({
            date: dateStr,
            reason: "NO_WEEKLY_SLOT_DEFINED",
            suggestedTime: null
          });
          continue;
        }

        if (spDayClearedForVisit.has(`${pidKey}:${dateStr}`)) {
          const pe = epochInIST(dateStr, preferredStartTime);
          const insideCleared = todaysSlots.some((slot) => {
            const a = epochInIST(dateStr, slot.slot_start);
            const b = epochInIST(dateStr, slot.slot_end);
            return pe >= a && pe + durationSec <= b;
          });
          if (insideCleared) {
            daysAtPreferredTime++;
          } else {
            daysWithDifferentTime++;
            exceptions.push({
              date: dateStr,
              reason: "OUTSIDE_WORKING_HOURS",
              suggestedTime: todaysSlots[0].slot_start
            });
          }
          continue;
        }

        const providerBookings = providerBookingsMerged;

        const preferredEpoch = epochInIST(dateStr, preferredStartTime);

        /* ---------- 1️⃣ Check Working Hours ---------- */
        const isInsideWorkingSlot = todaysSlots.some(slot => {
          const slotStartEpoch = epochInIST(dateStr, slot.slot_start);
          const slotEndEpoch = epochInIST(dateStr, slot.slot_end);

          return (
            preferredEpoch >= slotStartEpoch &&
            preferredEpoch + durationSec <= slotEndEpoch
          );
        });

        if (!isInsideWorkingSlot) {
          daysWithDifferentTime++;
          exceptions.push({
            date: dateStr,
            reason: "OUTSIDE_WORKING_HOURS",
            suggestedTime: todaysSlots[0].slot_start
          });
          continue;
        }

        /* Same customer + provider already engaged for another service in this period (e.g. MAID vs NANNY search) */
        if (hasCustomerID && prevForAvailability && isActiveBlockingEngagement(prevForAvailability)) {
          if (
            !rolesMatchForSearch(prevForAvailability.serviceType, roleSearchNorm) &&
            engagementOverlapsSearchWindow(prevForAvailability, startDate, endDate) &&
            calendarDayInPriorEngagement(prevForAvailability, dateStr)
          ) {
            daysWithDifferentTime++;
            exceptions.push({
              date: dateStr,
              reason: "EXISTING_CUSTOMER_OTHER_SERVICE",
              suggestedTime: null,
            });
            continue;
          }
        }

        /* ---------- 2️⃣ Check Booking Conflict ---------- */
        const prefEnd = preferredEpoch + durationSec;
        const blockingPreferred = providerBookings.filter(b =>
          overlaps(
            preferredEpoch,
            prefEnd,
            b.slot_start_epoch,
            b.slot_end_epoch
          )
        );
        const blockedByCustomerPriorEngagement = blockingPreferred.some(
          b => b._fromCustomerPriorEngagement
        );

        if (blockingPreferred.length === 0) {
          daysAtPreferredTime++;
          continue;
        }

        /* Customer already has this SP for this role on these dates — show in list, not fullyAvailable */
        if (blockedByCustomerPriorEngagement) {
          daysWithDifferentTime++;
          exceptions.push({
            date: dateStr,
            reason: "EXISTING_CUSTOMER_BOOKING",
            suggestedTime: null,
          });
          continue;
        }

        /* ---------- 3️⃣ Find Alternate Slot (other customers / generic BOOKED) ---------- */
        let alternate = null;

        for (const slot of todaysSlots) {
          const startHour = parseInt(slot.slot_start.split(":")[0]);
          const endHour = parseInt(slot.slot_end.split(":")[0]);

          for (let h = startHour; h < endHour; h++) {
            const epoch = epochInIST(
              dateStr,
              String(h).padStart(2, "0") + ":00"
            );

            const blocked = providerBookings.some(b =>
              overlaps(
                epoch,
                epoch + durationSec,
                b.slot_start_epoch,
                b.slot_end_epoch
              )
            );

            if (!blocked) {
              alternate = `${String(h).padStart(2, "0")}:00`;
              break;
            }
          }

          if (alternate) break;
        }

        if (alternate) {
          daysWithDifferentTime++;
          exceptions.push({
            date: dateStr,
            reason: "BOOKED",
            suggestedTime: alternate
          });
        } else {
          unavailableDays++;
          exceptions.push({
            date: dateStr,
            reason: "FULLY_BOOKED",
            suggestedTime: null
          });
        }
      }
      

      const providerRow = {
        serviceProviderId: p.serviceProviderId,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        gender: p.gender,
        experience: p.experience,
        rating: p.rating,
        diet: p.diet,
        cookingSpeciality: p.cookingSpeciality,
        languageKnown: languageKnownToArray(p.languageKnown),
        locality: p.locality,
        location: p.location,
        pinCode: p.pinCode,
        profilePic: p.profilePic,
        latitude: p.latitude,
        longitude: p.longitude,
        age: p.dob != null ? getAge(p.dob) : null,
        housekeepingRole: p.housekeepingRole,
        housekeepingRoles: (() => {
          const fromJunction = rolesBySpId[pidKey];
          if (fromJunction?.length) {
            const seen = new Set(
              fromJunction.map((r) => String(r).trim().toLowerCase())
            );
            const out = [...fromJunction];
            const leg = p.housekeepingRole != null ? String(p.housekeepingRole).trim() : "";
            if (leg && !seen.has(leg.toLowerCase())) {
              out.push(p.housekeepingRole);
            }
            return out;
          }
          return p.housekeepingRole ? [String(p.housekeepingRole).trim()] : [];
        })(),
        distanceKm: Number(p.distance_km.toFixed(2)),
        distance_km: Number(p.distance_km.toFixed(2)),
        bestMatch: false,
        hasCustomerOverlap:
          hasCustomerID &&
          customerHasSchedulableConflict(
            prevForAvailability,
            startDate,
            endDate,
            preferredStartTime,
            durationSec,
            roleSearchNorm
          ),
        monthlyAvailability: {
          preferredTime: preferredStartTime,
          fullyAvailable:
            unavailableDays === 0 && daysWithDifferentTime === 0,
          summary: {
            totalDays,
            daysAtPreferredTime,
            daysWithDifferentTime,
            unavailableDays
          },
          exceptions
        },
        availabilityFromDb: {
          weeklySlotsSource:
            weeklySlotSourceByProvider[pidKey] || "none",
          bookedRowsProviderAvailabilityInRange:
            paBookedCountBySp[pidKey] || 0,
          engagementsMonthlyOrShortTermInRange:
            engMonthlyShortTermBySp[pidKey] || 0,
          engagementsOnDemandInRange:
            engOnDemandBySp[pidKey] || 0,
          mergedBookedIntervalsUsedForOverlapCheck: providerBookingsMerged.length
        },
        previouslyBooked: false,
        previousBookingDetails: null,
        vacationAvailability: (() => {
          const vacRow = activeVacationByProvider.get(pidKey);
          return vacRow
            ? buildVacationAvailabilityPayload(vacRow, startDate, endDate)
            : null;
        })(),
      };

      if (hasCustomerID) {
        const pid = pidKey;
        const prev = previousBookingByProvider.get(pid);
        providerRow.previouslyBooked = !!prev;
        if (prev) {
          providerRow.previousBookingDetails = {
            ...prev,
            start_epoch: prev.startEpoch,
            duration_minutes: prev.durationMinutes,
            start_date_epoch: prev.startDateEpoch,
            end_date_epoch: prev.endDateEpoch,
            created_at_epoch: prev.createdAtEpoch,
          };
          if (
            !providerRow.vacationAvailability &&
            prev.leaveDays > 0 &&
            prev.vacationStartDate &&
            prev.vacationEndDate
          ) {
            providerRow.vacationAvailability = {
              status: "ACTIVE",
              engagementId: prev.engagementId,
              leaveDays: prev.leaveDays,
              vacationStartDate: calendarYmdKolkata(prev.vacationStartDate),
              vacationEndDate: calendarYmdKolkata(prev.vacationEndDate),
              engagementStartDate: calendarYmdKolkata(prev.startDate),
              engagementEndDate: calendarYmdKolkata(prev.endDate),
              overlapsSearchWindow: dateRangesOverlapYmd(
                prev.vacationStartDate,
                prev.vacationEndDate,
                startDate,
                endDate
              ),
            };
          }
        }
      }

      evaluatedProviders.push(providerRow);
    }


    /* ---------- STEP 5: Group & Rank ---------- */
    const available = evaluatedProviders.filter(
      p => p.monthlyAvailability.fullyAvailable
    );

    const notAvailable = evaluatedProviders.filter(
      p => !p.monthlyAvailability.fullyAvailable
    );

    available.sort((a, b) => a.distanceKm - b.distanceKm);

    const ordered = [...available, ...notAvailable];

    // When a customer is searching, prioritize providers they booked before.
    // This ensures previouslyBooked providers are visible in the first page.
    if (hasCustomerID) {
      ordered.sort((a, b) => {
        const ap = a.previouslyBooked ? 1 : 0;
        const bp = b.previouslyBooked ? 1 : 0;
        if (bp !== ap) return bp - ap;

        const af = a.monthlyAvailability.fullyAvailable ? 1 : 0;
        const bf = b.monthlyAvailability.fullyAvailable ? 1 : 0;
        if (bf !== af) return bf - af;

        return a.distanceKm - b.distanceKm;
      });
    }

    const bestMatchCandidate = ordered.find(
      (p) =>
        p.monthlyAvailability.fullyAvailable &&
        !p.hasCustomerOverlap
    );
    if (bestMatchCandidate) {
      bestMatchCandidate.bestMatch = true;
    }

    /* ---------- STEP 6: Pagination ---------- */
    const startIndex = (page - 1) * limit;
    const paginated = ordered.slice(startIndex, startIndex + limit);

    return {
      count: ordered.length,
      page,
      limit,
      providers: paginated
    };
}

router.post("/nearby-monthly", async (req, res) => {
  try {
    const result = await runNearbyMonthlyDiscovery(req.body, req.query);
    res.json(result);
  } catch (err) {
    if (err instanceof NearbyMonthlyError) {
      return res.status(err.status).json(err.body);
    }
    console.error("❌ nearby-monthly error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:providerId/check-schedule", async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    if (!Number.isFinite(providerId) || providerId < 1) {
      return res.status(400).json({ success: false, message: "Invalid providerId" });
    }

    const body = {
      ...(req.body || {}),
      serviceProviderId: providerId,
      serviceproviderid: providerId,
    };
    const result = await runNearbyMonthlyDiscovery(body, { page: 1, limit: 1 });
    const provider = result.providers?.[0];

    if (!provider) {
      return res.json({
        success: true,
        available: false,
        fullyAvailable: false,
        message:
          "Provider not found or not serving this role/area for your schedule.",
      });
    }

    const monthlyAvailability = provider.monthlyAvailability || {};
    const fullyAvailable = monthlyAvailability.fullyAvailable === true;

    return res.json({
      success: true,
      available: fullyAvailable,
      fullyAvailable,
      summary: monthlyAvailability.summary,
      exceptions: monthlyAvailability.exceptions ?? [],
      provider,
    });
  } catch (err) {
    if (err instanceof NearbyMonthlyError) {
      return res.status(err.status).json({ success: false, ...err.body });
    }
    console.error("❌ check-schedule error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if(!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalized = String(email).trim().toLowerCase();
    const result = await pool.query(
  `
  SELECT
    EXISTS (SELECT 1 FROM customer WHERE LOWER(TRIM("emailid")) = $1)
    OR
    EXISTS (SELECT 1 FROM serviceprovider WHERE LOWER(TRIM("emailid")) = $1)
    AS exists;
  `,
  [normalized]
);

    res.json({
      exists : result.rows[0].exists,
    });
  } catch (err) {
    console.error("check-email error:", err);
    res.status(500).json({ message: "Internal server error"});
  }
});

router.post("/check-mobile", async (req, res) => {
  try {
    const { mobile } = req.body;
    if(!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM customer WHERE "mobileno" = $1
        UNION ALL
        SELECT 1 FROM serviceprovider WHERE "mobileno" = $1
      ) AS exists;`,
      [mobile]
    );

    res.json({
      exists : result.rows[0].exists,
    });
  } catch (err) {
    console.error("check-mobile error:", err);
    res.status(500).json({ message: "Internal server error"});
  }
});

router.get('/providers',getPaginatedProviders);

/** Static path before /:id — avoids treating "add" as a bigint id on GET/HEAD. */
router.post("/serviceprovider/add", addProvider);
router.all("/serviceprovider/add", (req, res) => {
  if (req.method === "POST") return;
  res.status(405).json({
    success: false,
    code: "METHOD_NOT_ALLOWED",
    message: "Use POST /api/service-providers/serviceprovider/add to create a provider.",
  });
});

function guardProviderIdParam(req, res, next) {
  const id = String(req.params.id ?? "").trim().toLowerCase();
  if (id === "add") {
    return res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/service-providers/serviceprovider/add to create a provider.",
    });
  }
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({
      success: false,
      code: "INVALID_PROVIDER_ID",
      message: "Provider id must be a numeric serviceproviderid.",
    });
  }
  next();
}

router.get(
  "/serviceprovider/:id",
  guardProviderIdParam,
  optionalAuthenticateRead,
  loadActor,
  getProviderById
);
router.put("/serviceprovider/:id", guardProviderIdParam, updateProvider);
router.delete("/serviceprovider/:id", guardProviderIdParam, deleteProvider);
export default router;
