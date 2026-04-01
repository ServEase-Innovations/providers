import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const Provider = sequelize.define(
  "Provider",
  {
    serviceproviderid: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    vendorId: {
  type: DataTypes.BIGINT,
  allowNull: false,
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
      field: "alternateNo",
    },

    buildingName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "buildingName",
    },

    cookingSpeciality: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "cookingSpeciality",
    },

    vendorId: {
  type: DataTypes.BIGINT,
  allowNull: true, // ✅ important
  field: "vendorid",
},

    currentLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "currentLocation",
    },

    diet: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Raw timeslot string, e.g. "06:00-20:00" (or "06:00-20:00,10:00-14:00")
    // used in Swagger schemas and nearby search responses.
    timeslot: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "timeslot",
    },

    // NOTE: DB column is "languageknown" (all lowercase),
    // swagger/request uses "languageKnown" (camelCase).
    // Sequelize will map this attribute to that column.
    languageKnown: {
  type: DataTypes.STRING,
  field: "languageknown", // ✅ maps DB column
  allowNull: true
},

kycType: {
  type: DataTypes.STRING,
  field: "kyctype"
},
kycNumber: {
  type: DataTypes.STRING,
  field: "kycnumber"
},
kycImage: {
  type: DataTypes.TEXT,
  field: "kycimage"
},

    emailId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      field: "emailId",
    },

    enrolleddate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "firstName",
    },

    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    housekeepingRole: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "housekeepingRole",
    },

    // Request/response: nannyCareType (codes as string[] or CSV). DB: comma-separated TEXT.
    nannyCareType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "nannycaretypes",
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "lastName",
    },

    latitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },

    locality: {
      type: DataTypes.STRING,
      allowNull: false,
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
      field: "middleName",
    },

    mobileNo: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "mobileNo",
    },

    nearbyLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "nearbyLocation",
    },

    pincode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    rating: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
    },

    // Active flag used in raw SQL queries ("isactive" column)
    isactive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "isactive",
    },

    street: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    keyFacts: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: "keyFacts",
    },

    correspondence_address_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    permanent_address_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "serviceprovider",
    timestamps: false,
  }
);

export default Provider;