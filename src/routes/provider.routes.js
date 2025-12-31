import { Router } from "express";
import pg from "pg";

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
  return Math.floor(
    new Date(`${date}T${time}:00`).getTime() / 1000
  );
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
    const epoch = Math.floor(
      new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).getTime() / 1000
    );

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
 *
 *     tags:
 *       - Service Providers
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
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceproviderid:
 *                         type: integer
 *                         example: 3403
 *                       firstname:
 *                         type: string
 *                         example: Test
 *                       lastname:
 *                         type: string
 *                         example: Provider
 *                       distance_km:
 *                         type: number
 *                         example: 0.07
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
 *                                   enum: [BOOKED, ON_DEMAND, FULLY_BOOKED]
 *                                   example: BOOKED
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
      firstname: p.firstname,
      middlename: p.middlename,
      lastname: p.lastname,
      gender: p.gender,
      housekeepingrole: p.housekeepingrole,
      experience: p.experience,
      rating: p.rating,
      profilepic: p.profilepic,

      mobileno: p.mobileno,
      emailid: p.emailid,

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

function epochInIST(dateStr, timeStr = "00:00:00") {
  return Math.floor(
    new Date(`${dateStr}T${timeStr}${TZ_OFFSET}`).getTime() / 1000
  );
}

function getDayWindowEpoch(dateStr) {
  return {
    start: epochInIST(dateStr, "00:00:00"),
    end: epochInIST(dateStr, "23:59:59")
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
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
      page = 1,
      limit = 10
    } = req.body;

    if (!lat || !lng || !role || !startDate || !endDate || !preferredStartTime || !serviceDurationMinutes) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    /* ---------- STEP 1: Nearby Providers ---------- */
    const providersRes = await pool.query(
      `
      SELECT
  serviceproviderid,
  firstname,
  lastname,
  gender,
  experience,
  rating,
  profilepic,
  mobileno,
  emailid,
  diet,
  cookingspeciality,
  languageknown,
  locality,
  location,
  pincode,
  latitude,
  longitude,
  timeslot,
  age,
  housekeepingrole,
  (
    6371 * acos(
      cos(radians($1)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(latitude))
    )
  ) AS distance_km
FROM serviceprovider
WHERE isactive = true
  AND housekeepingrole = $3
  AND (
    6371 * acos(
      cos(radians($1)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(latitude))
    )
  ) <= $4
ORDER BY distance_km ASC
`,
      [lat, lng, role, radius]
    );

    if (!providersRes.rows.length) {
      return res.json({ count: 0, providers: [] });
    }

    const providerIds = providersRes.rows.map(p => p.serviceproviderid);

    /* ---------- STEP 2: Fetch bookings (epoch only) ---------- */
    const rangeStartEpoch = getDayWindowEpoch(startDate).start;
    const rangeEndEpoch = getDayWindowEpoch(endDate).end;

    const bookingsRes = await pool.query(
      `
      SELECT
        pa.serviceproviderid,
        pa.slot_start_epoch,
        pa.slot_end_epoch,
        COALESCE(e.booking_type, 'MONTHLY') AS booking_type
      FROM provider_availability pa
      LEFT JOIN engagements e
        ON e.engagement_id = pa.engagement_id
      WHERE
        pa.serviceproviderid = ANY($1)
        AND pa.slot_start_epoch BETWEEN $2 AND $3
      `,
      [providerIds, rangeStartEpoch, rangeEndEpoch]
    );

    const bookingsByProvider = {};
    for (const b of bookingsRes.rows) {
      bookingsByProvider[b.serviceproviderid] ??= [];
      bookingsByProvider[b.serviceproviderid].push(b);
    }

    /* ---------- STEP 3: Monthly Evaluation ---------- */
    const durationSec = serviceDurationMinutes * 60;
    const evaluatedProviders = [];

    for (const p of providersRes.rows) {
      const [workStart, workEnd] = p.timeslot.split("-");
      const [startH] = workStart.split(":").map(Number);
      const [endH] = workEnd.split(":").map(Number);

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
        const { start: dayStart, end: dayEnd } = getDayWindowEpoch(dateStr);

        const providerBookings = bookingsByProvider[p.serviceproviderid] || [];
        const dayBookings = providerBookings.filter(b =>
          overlaps(b.slot_start_epoch, b.slot_end_epoch, dayStart, dayEnd)
        );

        const hasOnDemand = dayBookings.some(b => b.booking_type === "ON_DEMAND");

        if (!hasOnDemand) {
          daysAtPreferredTime++;
          continue;
        }

        let alternate = null;
        for (let h = startH; h < endH; h++) {
          const epoch = epochInIST(dateStr, String(h).padStart(2, "0"));
          const blocked = dayBookings.some(b =>
            overlaps(epoch, epoch + durationSec, b.slot_start_epoch, b.slot_end_epoch)
          );
          if (!blocked) {
            alternate = `${String(h).padStart(2, "0")}:00`;
            break;
          }
        }

        if (alternate) {
          daysWithDifferentTime++;
          exceptions.push({ date: dateStr, reason: "ON_DEMAND", suggestedTime: alternate });
        } else {
          unavailableDays++;
          exceptions.push({ date: dateStr, reason: "FULLY_BOOKED", suggestedTime: null });
        }
      }

      evaluatedProviders.push({
        serviceproviderid: p.serviceproviderid,
        firstname: p.firstname,
        lastname: p.lastname,
        gender: p.gender,
  experience: p.experience,
  rating: p.rating,
  diet: p.diet,
  cookingspeciality: p.cookingspeciality,
  languageknown: p.languageknown,
    locality: p.locality,
  location: p.location,
  pincode: p.pincode,
  latitude: p.latitude,
  longitude: p.longitude,
  age : p.age,
  housekeepingrole: p.housekeepingrole,
        distance_km: Number(p.distance_km.toFixed(2)),
        bestMatch: false,
        monthlyAvailability: {
          preferredTime: preferredStartTime,
          fullyAvailable: unavailableDays === 0 && daysWithDifferentTime === 0,
          summary: {
            totalDays,
            daysAtPreferredTime,
            daysWithDifferentTime,
            unavailableDays
          },
          exceptions
        }
      });
    }

    /* ---------- STEP 4: Grouping ---------- */
    const available = evaluatedProviders.filter(
      p => p.monthlyAvailability.fullyAvailable
    );
    const notAvailable = evaluatedProviders.filter(
      p => !p.monthlyAvailability.fullyAvailable
    );

    /* ---------- STEP 5: Best Match ---------- */
    available.sort((a, b) => a.distance_km - b.distance_km);
    if (available.length > 0) {
      available[0].bestMatch = true;
    }

    /* ---------- STEP 6: Final ordering ---------- */
    const ordered = [...available, ...notAvailable];

    /* ---------- STEP 7: Pagination ---------- */
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









export default router;
