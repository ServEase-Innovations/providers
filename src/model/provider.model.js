import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const Provider = sequelize.define("Provider", {
    serviceproviderid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
    alternateno: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    buildingname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cookingspeciality: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    currentlocation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    diet: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    emailid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
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
    firstname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    geohash4: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    geohash5: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    geohash6: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    geohash7: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    housekeepingrole: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    idno: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    info: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isactive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    languageknown: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastname: {
        type: DataTypes.STRING,
        allowNull: false,
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
    middlename: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    mobileno: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    nearbylocation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pincode: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    profilepic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rating: {
        type: DataTypes.DECIMAL,
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
        allowNull: false,
    },
    timeslot: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    vendorid: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    security_deposit_collected: {
        type: DataTypes.SMALLINT,
        allowNull: true,
        defaultValue: 0,
    },
    correspondence_apartment: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    correspondence_city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    correspondence_country: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    correspondence_pincode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    correspondence_state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    correspondence_street: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_apartment: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_country: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_pincode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    permanent_street: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    key_facts:  {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    correspondence_address_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    permanent_address_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
},{    
    tableName: "serviceprovider",
    timestamps: false,
    underscored: false,
});

export default Provider;