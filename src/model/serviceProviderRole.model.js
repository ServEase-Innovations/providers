import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const ServiceProviderRole = sequelize.define(
  "ServiceProviderRole",
  {
    serviceproviderid: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(32),
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    tableName: "serviceprovider_roles",
    timestamps: false,
  }
);

export default ServiceProviderRole;
