import "../model/index.js";
import Provider from "../model/provider.model.js";
import Address from "../model/address.model.js";
import { sequelize } from "../config/database.js";
import ProviderWeeklySlot from "../model/providerWeeklySlot.model.js";
import ServiceProviderRole from "../model/serviceProviderRole.model.js";

/** Allowed values for request body `nannyCareType` (array items). */
const NANNY_CARE_TYPES = new Set([
  "ELDERLY_CARE",
  "INFANT_CARE",
  "TODDLER_CARE",
  "CHILD_CARE",
  "SPECIAL_NEEDS",
]);

function normalizeNannyCareTypesForDb(val) {
  if (val === null || val === "") return null;
  let items;
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === "string") {
    items = val.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const err = new Error(
      "nannyCareType must be an array of strings or a comma-separated string"
    );
    err.statusCode = 400;
    throw err;
  }
  const uniq = [...new Set(items.map((v) => String(v).trim()).filter(Boolean))];
  const invalid = uniq.filter((x) => !NANNY_CARE_TYPES.has(x));
  if (invalid.length) {
    const err = new Error(
      `Invalid nannyCareType: ${invalid.join(
        ", "
      )}. Allowed: ${[...NANNY_CARE_TYPES].join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }
  return uniq.length ? uniq.join(",") : null;
}

export const getPaginatedProvidersService = async (limit, offset) => {
    return await Provider.findAndCountAll({
        order: [['serviceproviderid', 'DESC']],
        limit,
        offset,
    });
};

export const getAllProvidersService = async () => {
    return await Provider.findAll();
}

export const getProvidersByVendorIdService = async (vendorId) => {
  return await Provider.findAll({
    where: { vendorId },
    order: [["serviceproviderid", "DESC"]],
  });
};

export const getProviderByIdService = async (serviceproviderid) => {
  return await Provider.findByPk(serviceproviderid);
};

export const addProviderService = async (providerData) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      permanentAddress,
      correspondenceAddress,
      weeklySlots,
      timeslot,
      housekeepingRoles,
      housekeepingRole: _ignoredHousekeepingRole,
      nannyCareType,
      languages,
      agentReferralId,
      ...serviceproviderdata
    } = providerData;

    const resolvedRoles = resolveHousekeepingRoles(providerData);
    if (resolvedRoles.length === 0) {
      const err = new Error(
        "housekeepingRoles is required: send a non-empty array, e.g. [\"COOK\",\"MAID\"]"
      );
      err.statusCode = 400;
      throw err;
    }

    // 1️⃣ Create addresses
    const correspondence = await Address.create(
      correspondenceAddress,
      { transaction }
    );

    const permanent = await Address.create(
      permanentAddress,
      { transaction }
    );

    // 2️⃣ Create provider FIRST
    const provider = await Provider.create(
      {
        ...serviceproviderdata,
        housekeepingRole: resolvedRoles[0] ?? null,
        // Persist raw timeslot string on provider row as well
        timeslot: providerData.timeslot,
        permanent_address_id: permanent.id,
        kycType: providerData.kycType,
    kycNumber: providerData.kycNumber,
    kycImage: providerData.kycImage || null,
        correspondence_address_id: correspondence.id,
        languageKnown: Array.isArray(languages)
  ? languages.join(",")
  : languages,
        ...(nannyCareType !== undefined && {
          nannyCareType: normalizeNannyCareTypesForDb(nannyCareType),
        }),
        vendorId: agentReferralId
      ? Number(agentReferralId)
      : null
      },
      { transaction }
    );


    // 3️⃣ Convert timeslot AFTER provider exists
    let finalWeeklySlots = [];

    if (weeklySlots && weeklySlots.length > 0) {
      finalWeeklySlots = weeklySlots;
    } else if (timeslot) {
      finalWeeklySlots = convertTimeslotString(timeslot);
    }

    // 4️⃣ Insert weekly slots
    if (finalWeeklySlots.length > 0) {
      const slotRows = finalWeeklySlots.map(slot => ({
    serviceproviderid: provider.serviceproviderid,
    dayOfWeek: slot.dayOfWeek,
    slotStart: slot.start,
    slotEnd: slot.end,
  }));

      await ProviderWeeklySlot.bulkCreate(slotRows, { transaction });
    }

    // 5️⃣ Generate daily slots
    await sequelize.query(`
      INSERT INTO provider_daily_slots (
        serviceproviderid,
        slot_date,
        slot_start,
        slot_end
      )
      SELECT
        ws.serviceproviderid,
        d::date,
        (d::date + ws.slot_start),
        (d::date + ws.slot_end)
      FROM provider_weekly_slots ws
      JOIN generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        INTERVAL '1 day'
      ) d
      ON EXTRACT(DOW FROM d) = ws.day_of_week
      WHERE ws.serviceproviderid = :providerId
    `, {
      replacements: { providerId: provider.serviceproviderid },
      transaction
    });

    await ServiceProviderRole.bulkCreate(
      resolvedRoles.map((role) => ({
        serviceproviderid: provider.serviceproviderid,
        role,
      })),
      { transaction }
    );

    await transaction.commit();
    return provider;

  } catch (error) {
    console.error("FULL ERROR:", error);
    await transaction.rollback();
    throw error;
  }
};

/** Unique non-empty roles from housekeepingRoles[] only. */
function resolveHousekeepingRoles(providerData) {
  if (!Array.isArray(providerData.housekeepingRoles)) return [];
  return [
    ...new Set(
      providerData.housekeepingRoles
        .map((r) => String(r).trim())
        .filter(Boolean)
    ),
  ];
}


const convertTimeslotString = (timeslot) => {
  if (!timeslot) return [];

  const ranges = timeslot.split(",");
  const weeklySlots = [];

  for (let day = 0; day <= 6; day++) {
    for (const range of ranges) {
      const [start, end] = range.trim().split("-");

      if (!start || !end) {
        throw new Error("Invalid timeslot format");
      }

      if (start >= end) {
        throw new Error("Start time must be before end time");
      }

      weeklySlots.push({
        dayOfWeek: day,
        start,
        end
      });
    }
  }

  return weeklySlots;
};
export const updateProviderService = async (serviceproviderid, providerData) => {
  const provider = await Provider.findByPk(serviceproviderid);

  if (!provider) {
    return null;
  }

  const {
    housekeepingRoles,
    housekeepingRole: _ignoredHousekeepingRole,
    nannyCareType,
    ...providerFields
  } = providerData;

  if (nannyCareType !== undefined) {
    providerFields.nannyCareType = normalizeNannyCareTypesForDb(nannyCareType);
  }

  if (Array.isArray(housekeepingRoles)) {
    const sid = provider.serviceproviderid;
    const t = await sequelize.transaction();
    try {
      await provider.update(providerFields, { transaction: t });
      await ServiceProviderRole.destroy({
        where: { serviceproviderid: sid },
        transaction: t,
      });
      const roles = [
        ...new Set(
          housekeepingRoles.map((r) => String(r).trim()).filter(Boolean)
        ),
      ];
      if (roles.length > 0) {
        await ServiceProviderRole.bulkCreate(
          roles.map((role) => ({ serviceproviderid: sid, role })),
          { transaction: t }
        );
      }
      await provider.update(
        { housekeepingRole: roles[0] ?? null },
        { transaction: t }
      );
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
    return provider.reload();
  }

  await provider.update(providerFields);
  return provider;
};