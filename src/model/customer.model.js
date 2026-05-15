import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

/**
 * DB columns are lowercase/snake where applicable. Sequelize attributes use camelCase
 * and map via `field` — same pattern as `Provider`.
 */
const Customer = sequelize.define(
  "Customer",
  {
    customerId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: "customerid",
    },
    kyc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alternateNo: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "alternateno",
    },
    buildingName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "buildingname",
    },
    currentLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "currentlocation",
    },
    emailId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "emailid",
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    enrolledDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: "enrolleddate",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "firstname",
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    idNo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "idno",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "isactive",
    },
    languageKnown: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "languageknown",
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "lastname",
    },
    locality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    middleName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "middlename",
    },
    mobileNo: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "mobileno",
    },
    pinCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "pincode",
    },
    profilePic: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "profilepic",
    },
    rating: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5,
      },
    },
    speciality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "customer",
    timestamps: false,
    underscored: false,
  }
);

export default Customer;
