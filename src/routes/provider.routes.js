import { Router } from "express";
import pg from "pg";
import {
  addProvider,
  getPaginatedProviders,
  getProviderById,
 updateProvider
} from "../controllers/provider.controller.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const router = Router();
const { Pool } = pg;

/* -------------------- DB -------------------- */
const pool = new Pool({
  host: "13.126.11.184",
  user: "serveaso",
  password: "serveaso",
  database: "serveaso",
  port: 5432,
});

/* -------------------- HELPERS -------------------- */

// Convert date + time → epoch seconds
function toEpoch(date, time) {
  return epochInIST(date, time);
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
    const epoch = epochInIST(dateStr, `${String(h).padStart(2,"0")}:00`);
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
 *                       serviceproviderid:
 *                         type: integer
 *                         example: 3403
 *                       firstName:
 *                         type: string
 *                         example: Test
 *                       lastname:
 *                         type: string
 *                         example: Provider
 *                       distance_km:
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

router.get("/nearby", async (req, res) => {
  try {
    let { lat, lng, date, startTime, role, radius = 10 } = req.query;

    if (!lat || !lng || !date || !startTime || !role) {
      return res.status(400).json({ message: "Missing required params" });
    }

    lat = Number(lat);
    lng = Number(lng);

    // 🛡 Fix swapped lat/lng automatically
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      [lat, lng] = [lng, lat];
    }

    const startEpoch = toEpoch(date, startTime);

    const values = [lat, lng, role, date, startEpoch, Number(radius)];

    const { rows } = await pool.query(SQL_QUERY, values);

    const providers = rows.map(p => ({
      serviceproviderid: p.serviceproviderid,
      firstName: p.firstName,
      middlename: p.middlename,
      lastname: p.lastname,
      gender: p.gender,
      housekeepingrole: p.housekeepingrole,
      experience: p.experience,
      rating: p.rating,
      profilepic: p.profilepic,

      mobileno: p.mobileno,
      emailId: p.emailId,

      locality: p.locality,
      location: p.location,
      pincode: p.pincode,

      diet: p.diet,
      cookingspeciality: p.cookingspeciality,
      languageknown: p.languageknown,

      latitude: p.latitude,
      longitude: p.longitude,
      distance_km: Number(p.distance_km.toFixed(2)),

      availableNow: p.available_now,
      nextAvailableAt:
        p.available_now || !p.next_available_epoch
          ? null
          : new Date(p.next_available_epoch * 1000)
              .toTimeString()
              .slice(0, 5),

      availableTimes: generateHourlyAvailability(
        p.timeslot,
        p.booked_slots,
        date
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
  if (!prev || prev.active === false) return [];
  const st = prev.serviceType != null ? String(prev.serviceType).trim().toLowerCase() : "";
  if (!st || st !== String(roleNorm).trim().toLowerCase()) return [];

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




router.post("/nearby-monthly", async (req, res) => {
  try {
    const {
      lat,
      lng,
      role,
      radius = 10,
      startDate,
      endDate,
      preferredStartTime,
      serviceDurationMinutes,
      customerID,
      customerId
    } = req.body;

    const { page, limit } = parseNearbyMonthlyPagination(req.query, req.body);

    if (
      !lat ||
      !lng ||
      !role ||
      !startDate ||
      !endDate ||
      !preferredStartTime ||
      !serviceDurationMinutes
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD for startDate and endDate.",
      });
    }

    if (!isValidTimeHHmm(preferredStartTime)) {
      return res.status(400).json({
        message: "Invalid preferredStartTime. Use HH:mm (24-hour), e.g. 08:00.",
      });
    }

    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      return res.status(400).json({
        message: "endDate must be on/after startDate.",
      });
    }

    const roleSearchNorm = String(role).trim();

    const customerIdInput = customerID ?? customerId;
    const customerIdRaw =
      customerIdInput != null && customerIdInput !== ""
        ? Number(customerIdInput)
        : null;
    const hasCustomerID =
      customerIdRaw != null && !Number.isNaN(customerIdRaw);

    /* ---------- STEP 1: Nearby Providers ---------- */
    const providersRes = await pool.query(
      `
      SELECT
        sp."serviceproviderid",
        sp."firstName",
        sp."lastName",
        sp."gender",
        sp."experience",
        sp."rating",
        sp."profilepic",
        sp."mobileNo",
        sp."emailId",
        sp."diet",
        sp."cookingSpeciality",
        sp."languageknown",
        sp."locality",
        sp."location",
        sp."pincode",
        sp."latitude",
        sp."longitude",
        sp."dob",
        sp."timeslot",
        sp."housekeepingRole",
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(sp."latitude")) *
            cos(radians(sp."longitude") - radians($2)) +
            sin(radians($1)) * sin(radians(sp."latitude"))
          )
        ) AS distance_km
      FROM "serviceprovider" sp
      WHERE sp."isactive" = true
        AND (
          EXISTS (
            SELECT 1
            FROM serviceprovider_roles r
            WHERE r.serviceproviderid = sp."serviceproviderid"
              AND LOWER(TRIM(r.role::text)) = LOWER(TRIM($3::text))
          )
          OR (
            NOT EXISTS (
              SELECT 1
              FROM serviceprovider_roles r2
              WHERE r2.serviceproviderid = sp."serviceproviderid"
            )
            AND LOWER(TRIM(COALESCE(sp."housekeepingRole", ''::text))) = LOWER(TRIM($3::text))
          )
          OR (
            LOWER(TRIM(COALESCE(sp."housekeepingRole", ''::text))) = LOWER(TRIM($3::text))
            AND NOT EXISTS (
              SELECT 1
              FROM serviceprovider_roles r3
              WHERE r3.serviceproviderid = sp."serviceproviderid"
                AND LOWER(TRIM(r3.role::text)) = LOWER(TRIM($3::text))
            )
          )
        )
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(sp."latitude")) *
            cos(radians(sp."longitude") - radians($2)) +
            sin(radians($1)) * sin(radians(sp."latitude"))
          )
        ) <= $4
      ORDER BY distance_km ASC
      `,
      [lat, lng, roleSearchNorm, radius]
    );

    if (!providersRes.rows.length) {
      return res.json({ count: 0, providers: [] });
    }

    const providerIds = providersRes.rows.map(p => p.serviceproviderid);

    const rolesRes = await pool.query(
      `
      SELECT serviceproviderid, role
      FROM serviceprovider_roles
      WHERE serviceproviderid = ANY($1::bigint[])
      ORDER BY role
      `,
      [providerIds]
    );
    const rolesBySpId = {};
    for (const row of rolesRes.rows) {
      const id = String(row.serviceproviderid);
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
          e."serviceproviderid" AS "serviceproviderid",
          e."booking_type" AS "bookingType",
          e."service_type" AS "serviceType",
          e."start_date" AS "startDate",
          e."end_date" AS "endDate",
          e."start_epoch" AS "startEpoch",
          e."duration_minutes" AS "durationMinutes",
          e."engagement_status" AS "engagementStatus",
          e."assignment_status" AS "assignmentStatus",
          e."task_status" AS "taskStatus",
          e."active" AS "active",
          e."base_amount" AS "baseAmount",
          e."created_at" AS "createdAt"
        FROM engagements e
        WHERE e."customerid" = $1
          AND e."serviceproviderid" = ANY($2::bigint[])
        ORDER BY
          e."serviceproviderid",
          e."end_date" DESC NULLS LAST,
          e."created_at" DESC NULLS LAST
        `,
        [customerIdRaw, providerIds]
      );
      for (const row of prevRes.rows) {
        const id = String(row.serviceproviderid);
        previousBookingByProvider.set(id, {
          engagementId: row.engagementId != null ? String(row.engagementId) : null,
          bookingType: row.bookingType,
          serviceType: row.serviceType,
          startDate: row.startDate,
          endDate: row.endDate,
          startEpoch: row.startEpoch != null ? Number(row.startEpoch) : null,
          durationMinutes:
            row.durationMinutes != null ? Number(row.durationMinutes) : null,
          engagementStatus: row.engagementStatus,
          assignmentStatus: row.assignmentStatus,
          taskStatus: row.taskStatus,
          active: row.active,
          baseAmount: row.baseAmount != null ? Number(row.baseAmount) : null,
          createdAt: row.createdAt
        });
      }
    }

    /* ---------- STEP 2: Fetch Weekly Slots ---------- */
    const weeklySlotsRes = await pool.query(
      `
      SELECT serviceproviderid, day_of_week, slot_start, slot_end
      FROM provider_weekly_slots
      WHERE serviceproviderid = ANY($1)
      `,
      [providerIds]
    );

    const weeklySlotsByProvider = {};
    /** @type {Record<string, 'provider_weekly_slots' | 'timeslot' | 'none'>} */
    const weeklySlotSourceByProvider = {};
    for (const row of weeklySlotsRes.rows) {
      const sid = String(row.serviceproviderid);
      weeklySlotSourceByProvider[sid] = "provider_weekly_slots";
      weeklySlotsByProvider[sid] ??= [];
      weeklySlotsByProvider[sid].push({
        day_of_week: Number(row.day_of_week),
        slot_start: normalizeTimeForEpoch(row.slot_start),
        slot_end: normalizeTimeForEpoch(row.slot_end)
      });
    }

    for (const p of providersRes.rows) {
      const id = String(p.serviceproviderid);
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
      const id = String(p.serviceproviderid);
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
        pa.serviceproviderid,
        pa.date::text AS "dateStr",
        pa.slot_start_epoch,
        pa.slot_end_epoch,
        pa.engagement_id AS "engagementId",
        e.duration_minutes AS "engagementDurationMinutes"
      FROM provider_availability pa
      LEFT JOIN engagements e ON e.engagement_id = pa.engagement_id
      WHERE
        pa.serviceproviderid = ANY($1)
        AND pa.status = 'BOOKED'
        AND pa.date BETWEEN $2::date AND $3::date
        AND pa.slot_start_epoch IS NOT NULL
        AND pa.slot_end_epoch IS NOT NULL
      `,
      [providerIds, startDate, endDate]
    );

    /* ---------- Fallback: Engagements (in case provider_availability not populated) ---------- */
    const engagementsRes = await pool.query(
      `
      SELECT
        e.serviceproviderid,
        e.booking_type,
        e.start_date,
        e.end_date,
        e.start_epoch,
        e.end_epoch,
        e.duration_minutes
      FROM engagements e
      WHERE
        e.serviceproviderid = ANY($1)
        AND e.serviceproviderid IS NOT NULL
        AND e.active = true
        AND e.start_date <= $3::date
        AND e.end_date >= $2::date
        AND e.booking_type IN ('MONTHLY', 'SHORT_TERM', 'ON_DEMAND')
        AND (e.engagement_status = 'ASSIGNED' OR e.assignment_status = 'ASSIGNED')
        AND (
          e.service_type IS NULL
          OR LOWER(TRIM(e.service_type::text)) = LOWER(TRIM($4::text))
        )
      `,
      [providerIds, startDate, endDate, roleSearchNorm]
    );

    const bookingsByProvider = {};
    const paBookedCountBySp = {};
    const providersWithPaBookedRows = new Set();
    for (const b of bookingsRes.rows) {
      const spid = String(b.serviceproviderid);
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
      const spid = String(e.serviceproviderid);

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
        const slotStart = epochInIST(dateStr, timeStr);
        const slotEnd = slotStart + durationSec;

        bookingsByProvider[spid] ??= [];
        bookingsByProvider[spid].push({
          slot_start_epoch: slotStart,
          slot_end_epoch: slotEnd
        });
        cursor = cursor.add(1, "day");
      }
    }

    /* ---------- STEP 4: Monthly Evaluation ---------- */
    const durationSec = serviceDurationMinutes * 60;
    const evaluatedProviders = [];

    for (const p of providersRes.rows) {
      const pidKey = String(p.serviceproviderid);
      const providerWeeklySlots = weeklySlotsByProvider[pidKey] || [];

      const baseBookings = bookingsByProvider[pidKey] || [];
      const prevForSp = hasCustomerID
        ? previousBookingByProvider.get(pidKey)
        : null;
      const fromPrevEngagement = previousEngagementBusyIntervals(
        prevForSp,
        startDate,
        endDate,
        roleSearchNorm,
        durationSec
      );
      const providerBookingsMerged = [...baseBookings, ...fromPrevEngagement];

      let totalDays = 0;
      let daysAtPreferredTime = 0;
      let daysWithDifferentTime = 0;
      let unavailableDays = 0;
      const exceptions = [];

      for (
        let d = new Date(startDate);
        d <= new Date(endDate);
        d.setDate(d.getDate() + 1)
      ) {
        totalDays++;

        const dateStr = d.toISOString().slice(0, 10);
        const dow = d.getDay();

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

        const providerBookings = providerBookingsMerged;

        const preferredEpoch = epochInIST(dateStr, preferredStartTime);

        // console.log(`Evaluating Provider ${pidKey} on ${dateStr} with preferred time ${preferredStartTime}`);

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
        if (hasCustomerID && prevForSp && prevForSp.active !== false) {
          const st =
            prevForSp.serviceType != null
              ? String(prevForSp.serviceType).trim().toLowerCase()
              : "";
          const roleL = String(roleSearchNorm).trim().toLowerCase();
          if (
            st &&
            st !== roleL &&
            engagementOverlapsSearchWindow(prevForSp, startDate, endDate) &&
            calendarDayInPriorEngagement(prevForSp, dateStr)
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

        /* Only this customer's current engagement (synthetic + matching PA) — same wall slot as requested */
        const ownBookingBlock = b =>
          Boolean(b._fromCustomerPriorEngagement || b._customerOwnPa);
        const ownInPreferred = blockingPreferred.filter(ownBookingBlock);
        const foreignInPreferred = blockingPreferred.filter(
          b => !ownBookingBlock(b)
        );
        if (
          foreignInPreferred.length === 0 &&
          ownInPreferred.some(
            p =>
              preferredEpoch >= p.slot_start_epoch &&
              prefEnd <= p.slot_end_epoch
          )
        ) {
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
        serviceproviderid: p.serviceproviderid,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        experience: p.experience,
        rating: p.rating,
        diet: p.diet,
        cookingSpeciality: p.cookingSpeciality,
        languageknown: p.languageknown,
        locality: p.locality,
        location: p.location,
        pincode: p.pincode,
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
        distance_km: Number(p.distance_km.toFixed(2)),
        bestMatch: false,
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
        }
      };

      if (hasCustomerID) {
        const pid = pidKey;
        const prev = previousBookingByProvider.get(pid);
        providerRow.previouslyBooked = !!prev;
        if (prev) {
          const {
            startEpoch: _se,
            durationMinutes: _dm,
            ...prevForApi
          } = prev;
          providerRow.previousBookingDetails = prevForApi;
        } else {
          providerRow.previousBookingDetails = null;
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

    available.sort((a, b) => a.distance_km - b.distance_km);

    if (available.length > 0) {
      available[0].bestMatch = true;
    }

    const ordered = [...available, ...notAvailable];

    // When a customer is searching, prioritize providers they booked before.
    // This ensures previouslyBooked providers are visible in the first page.
    if (hasCustomerID) {
      for (const p of ordered) p.bestMatch = false;
      ordered.sort((a, b) => {
        const ap = a.previouslyBooked ? 1 : 0;
        const bp = b.previouslyBooked ? 1 : 0;
        if (bp !== ap) return bp - ap;

        const af = a.monthlyAvailability.fullyAvailable ? 1 : 0;
        const bf = b.monthlyAvailability.fullyAvailable ? 1 : 0;
        if (bf !== af) return bf - af;

        return a.distance_km - b.distance_km;
      });

      if (ordered.length > 0) ordered[0].bestMatch = true;
    }

    /* ---------- STEP 6: Pagination ---------- */
    const startIndex = (page - 1) * limit;
    const paginated = ordered.slice(startIndex, startIndex + limit);

    res.json({
      count: ordered.length,
      page,
      limit,
      providers: paginated
    });

  } catch (err) {
    console.error("❌ nearby-monthly error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if(!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await pool.query(
  `
  SELECT
    EXISTS (SELECT 1 FROM customer WHERE "emailid" = $1)
    OR
    EXISTS (SELECT 1 FROM serviceprovider WHERE "emailId" = $1)
    AS exists;
  `,
  [email]
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
        SELECT 1 FROM serviceprovider WHERE "mobileNo" = $1
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
router.get("/serviceprovider/:id", getProviderById);
router.post('/serviceprovider/add', addProvider)
router.put("/serviceprovider/:id", updateProvider);
export default router;
