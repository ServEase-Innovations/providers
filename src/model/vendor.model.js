import { sequelize } from "../config/database.js";
import { DataTypes } from "sequelize";

const Vendor = sequelize.define("Vendor", {
    vendorid: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    companyname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createddate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    emailid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    isactive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    phoneno: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    registrationid: {
        type: DataTypes.STRING,
        allowNull: true,
    },
},{
    timestamps: false,
    tableName: "vendor",
    underscored: false
});;

export default Vendor;