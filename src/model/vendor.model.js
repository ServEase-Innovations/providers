import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const Vendor = sequelize.define(
  "Vendor",
  {
    vendorId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: "vendorid",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "address",
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "companyname",
    },
    createdDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: "createddate",
    },
    emailId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "emailId",
      validate: {
        isEmail: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "isactive",
    },
    phoneNo: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "phoneno",
    },
    registrationId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "registrationid",
    },
  },
  {
    tableName: "vendor",
    timestamps: false,
  }
);

export default Vendor;