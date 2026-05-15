import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

/**
 * DB columns are lowercase/snake where applicable. Sequelize attributes use camelCase
 * and map via `field`.
 */
const Provider = sequelize.define(
  "Provider",
  {
    serviceProviderId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: "serviceproviderid",
    },
    vendorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "vendorid",
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kyc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
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
    cookingSpeciality: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "cookingspeciality",
    },
    currentLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "currentlocation",
    },
    diet: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timeslot: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "timeslot",
    },
    languageKnown: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "languageknown",
    },
    emailId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "emailid",
    },
    enrolledDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      field: "enrolleddate",
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "firstname",
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    geohash4: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "geohash4",
    },
    geohash5: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "geohash5",
    },
    geohash6: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "geohash6",
    },
    geohash7: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "geohash7",
    },
    housekeepingRole: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "housekeepingrole",
    },
    idNo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "idno",
    },
    info: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
      field: "isactive",
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "lastname",
    },
    latitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    locality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL,
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
    nearbyLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "nearbylocation",
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
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
    },
    speciality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    keyFacts: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: "keyfacts",
    },
    nannyCareType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "nannycaretypes",
    },
    correspondenceAddressId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "correspondence_address_id",
    },
    permanentAddressId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "permanent_address_id",
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "bankname",
    },
    ifscCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "ifsccode",
    },
    accountHolderName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accountholdername",
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accountnumber",
    },
    accountType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "accounttype",
    },
    upiId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "upiid",
    },
    kycType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "kyctype",
    },
    kycNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "kycnumber",
    },
    kycImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "kycimage",
    },
  },
  {
    tableName: "serviceprovider",
    timestamps: false,
    underscored: false,
  }
);

export default Provider;
