import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

const Customer = sequelize.define("Customer", {
    customerid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    kyc : {
        type: DataTypes.STRING,
        allowNull: true,
    },
    alternateno: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    buildingname: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    currentlocation: {
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
    firstname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    idno: {
        type: DataTypes.STRING,
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
    locality: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    middlename: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    mobileno: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    pincode: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    profilepic: {
        type: DataTypes.STRING,
        allowNull: true,
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
},{
    tableName: "customer",
    timestamps: false,
    underscored: false,
});

export default Customer;