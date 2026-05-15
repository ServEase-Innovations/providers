import "../model/index.js";
import Provider from "../model/provider.model.js";
import Address from "../model/address.model.js";
import { sequelize } from "../config/database.js";
import ProviderWeeklySlot from "../model/providerWeeklySlot.model.js";
import ServiceProviderRole from "../model/serviceProviderRole.model.js";
import { languageKnownToDb } from "../utils/languageKnown.util.js";

/** Accept legacy lowercase / snake_case keys; Sequelize uses camelCase attributes. */
function normalizeProviderPayload(data) {
  if (!data || typeof data !== "object") return data;
  const o = { ...data };
  const alias = [
    ["serviceproviderid", "serviceProviderId"],
    ["firstname", "firstName"],
    ["lastname", "lastName"],
    ["middlename", "middleName"],
    ["emailid", "emailId"],
    ["mobileno", "mobileNo"],
    ["alternateno", "alternateNo"],
    ["buildingname", "buildingName"],
    ["currentlocation", "currentLocation"],
    ["languageknown", "languageKnown"],
    ["nearbylocation", "nearbyLocation"],
    ["housekeepingrole", "housekeepingRole"],
    ["cookingspeciality", "cookingSpeciality"],
    ["vendorid", "vendorId"],
    ["profilepic", "profilePic"],
    ["pincode", "pinCode"],
    ["idno", "idNo"],
    ["isactive", "isActive"],
    ["enrolleddate", "enrolledDate"],
    ["correspondence_address_id", "correspondenceAddressId"],
    ["permanent_address_id", "permanentAddressId"],
    ["nannycaretypes", "nannyCareType"],
    ["keyfacts", "keyFacts"],
    ["ifsccode", "ifscCode"],
    ["bankname", "bankName"],
    ["accountholdername", "accountHolderName"],
    ["accountnumber", "accountNumber"],
    ["accounttype", "accountType"],
    ["upiid", "upiId"],
    ["kyctype", "kycType"],
    ["kycnumber", "kycNumber"],
    ["kycimage", "kycImage"],
  ];
  for (const [legacy, canonical] of alias) {
    if (o[canonical] === undefined && o[legacy] !== undefined) {
      o[canonical] = o[legacy];
    }
    delete o[legacy];
  }
  if (o.languageKnown !== undefined) {
    o.languageKnown = languageKnownToDb(o.languageKnown);
  }
  return o;
}

/** `nannyCareType`: free-form string codes; stored comma-separated in DB. */
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
  return uniq.length ? uniq.join(",") : null;
}

export const getPaginatedProvidersService = async (limit, offset) => {
    return await Provider.findAndCountAll({
        order: [["serviceProviderId", "DESC"]],
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
    order: [["serviceProviderId", "DESC"]],
  });
};

export const getProviderByIdService = async (serviceproviderid) => {
  return await Provider.findByPk(serviceproviderid);
};

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
        end,
      });
    }
  }

  return weeklySlots;
};

/** Same rules as create: prefer explicit weeklySlots, else parse timeslot string. */
function resolveFinalWeeklySlots({ weeklySlots, timeslot }) {
  if (weeklySlots && weeklySlots.length > 0) {
    return weeklySlots;
  }
  if (timeslot) {
    return convertTimeslotString(timeslot);
  }
  return [];
}

async function replaceProviderSlotTables(
  serviceproviderid,
  finalWeeklySlots,
  transaction
) {
  await ProviderWeeklySlot.destroy({
    where: { serviceProviderId: serviceproviderid },
    transaction,
  });

  await sequelize.query(
    `DELETE FROM provider_daily_slots
     WHERE serviceproviderid = :providerId AND slot_date >= CURRENT_DATE`,
    { replacements: { providerId: serviceproviderid }, transaction }
  );

  if (finalWeeklySlots.length === 0) {
    return;
  }

  const slotRows = finalWeeklySlots.map((slot) => ({
    serviceProviderId: serviceproviderid,
    dayOfWeek: slot.dayOfWeek,
    slotStart: slot.start,
    slotEnd: slot.end,
  }));

  await ProviderWeeklySlot.bulkCreate(slotRows, { transaction });

  await sequelize.query(
    `INSERT INTO provider_daily_slots (
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
      WHERE ws.serviceproviderid = :providerId`,
    {
      replacements: { providerId: serviceproviderid },
      transaction,
    }
  );
}

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

    const spRow = normalizeProviderPayload(serviceproviderdata);

    const resolvedRoles = resolveHousekeepingRoles(providerData);

    // 1️⃣ Create addresses only when payload includes them
    const correspondence =
      correspondenceAddress && typeof correspondenceAddress === "object"
        ? await Address.create(correspondenceAddress, { transaction })
        : null;

    const permanent =
      permanentAddress && typeof permanentAddress === "object"
        ? await Address.create(permanentAddress, { transaction })
        : null;

    // 2️⃣ Create provider FIRST
    const provider = await Provider.create(
      {
        ...spRow,
        housekeepingRole: resolvedRoles[0] ?? null,
        // Persist raw timeslot string on provider row as well
        timeslot: providerData.timeslot,
        permanentAddressId: permanent?.id ?? null,
        kycType: providerData.kycType,
        kycNumber: providerData.kycNumber,
        kycImage: providerData.kycImage || null,
        correspondenceAddressId: correspondence?.id ?? null,
        languageKnown: languageKnownToDb(
          languages !== undefined ? languages : spRow.languageKnown
        ),
        ...(nannyCareType !== undefined && {
          nannyCareType: normalizeNannyCareTypesForDb(nannyCareType),
        }),
        vendorId: agentReferralId ? Number(agentReferralId) : null,
      },
      { transaction }
    );

    const finalWeeklySlots = resolveFinalWeeklySlots({ weeklySlots, timeslot });
    await replaceProviderSlotTables(
      provider.serviceProviderId,
      finalWeeklySlots,
      transaction
    );

    if (resolvedRoles.length > 0) {
      await ServiceProviderRole.bulkCreate(
        resolvedRoles.map((role) => ({
          serviceProviderId: provider.serviceProviderId,
          role,
        })),
        { transaction }
      );
    }

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

export const updateProviderService = async (serviceproviderid, providerData) => {
  const provider = await Provider.findByPk(serviceproviderid);

  if (!provider) {
    return null;
  }

  const {
    housekeepingRoles,
    housekeepingRole: _ignoredHousekeepingRole,
    nannyCareType,
    weeklySlots,
    timeslot,
    languages,
    agentReferralId,
    ...providerFieldsRest
  } = providerData;

  const providerFields = normalizeProviderPayload(providerFieldsRest);

  if (nannyCareType !== undefined) {
    providerFields.nannyCareType = normalizeNannyCareTypesForDb(nannyCareType);
  }
  if (timeslot !== undefined) {
    providerFields.timeslot = timeslot;
  }
  if (languages !== undefined) {
    providerFields.languageKnown = languageKnownToDb(languages);
  }
  if (agentReferralId !== undefined) {
    providerFields.vendorId = agentReferralId ? Number(agentReferralId) : null;
  }

  const shouldRefreshSlots =
    weeklySlots !== undefined || timeslot !== undefined;
  const finalWeeklySlotsForRefresh = shouldRefreshSlots
    ? resolveFinalWeeklySlots({ weeklySlots, timeslot })
    : null;

  const sid = provider.serviceProviderId;

  if (Array.isArray(housekeepingRoles)) {
    const t = await sequelize.transaction();
    try {
      const roles = [
        ...new Set(
          housekeepingRoles.map((r) => String(r).trim()).filter(Boolean)
        ),
      ];
      await provider.update(
        {
          ...providerFields,
          housekeepingRole: roles[0] ?? null,
        },
        { transaction: t }
      );
      if (shouldRefreshSlots) {
        await replaceProviderSlotTables(sid, finalWeeklySlotsForRefresh, t);
      }
      await ServiceProviderRole.destroy({
        where: { serviceProviderId: sid },
        transaction: t,
      });
      if (roles.length > 0) {
        await ServiceProviderRole.bulkCreate(
          roles.map((role) => ({ serviceProviderId: sid, role })),
          { transaction: t }
        );
      }
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
    return provider.reload();
  }

  if (shouldRefreshSlots) {
    const t = await sequelize.transaction();
    try {
      await provider.update(providerFields, { transaction: t });
      await replaceProviderSlotTables(sid, finalWeeklySlotsForRefresh, t);
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