import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const ProviderWeeklySlot = sequelize.define(
  "ProviderWeeklySlot",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    serviceproviderid: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "day_of_week",
      validate: {
        min: 0,
        max: 6,
      },
    },

    slotStart: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "slot_start",
    },

    slotEnd: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "slot_end",
    },
  },
  {
    tableName: "provider_weekly_slots",
    timestamps: false,
  }
);

export default ProviderWeeklySlot;