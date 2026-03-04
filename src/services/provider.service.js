import Provider from "../model/provider.model.js";
import Address from "../model/address.model.js";
import { sequelize } from "../config/database.js"; 
import ProviderWeeklySlot from "../model/providerWeeklySlot.model.js";

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

export const addProviderService = async (providerData) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      permanentAddress,
      correspondenceAddress,
      weeklySlots,
      timeslot,
      ...serviceproviderdata
    } = providerData;

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
        permanent_address_id: permanent.id,
        correspondence_address_id: correspondence.id
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

    await transaction.commit();
    return provider;

  } catch (error) {
    console.error("FULL ERROR:", error);
    await transaction.rollback();
    throw error;
  }
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
        end
      });
    }
  }

  return weeklySlots;
};