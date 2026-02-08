import { sequelize } from "../config/database.js"; 
import { DataTypes } from "sequelize";

const Address = sequelize.define("Address", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ctarea: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    field1: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    field2: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pinno: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
},{
    tableName: "address",
    timestamps: false,
    underscored: false,
});

Address.associate = (models) => {
    Address.hasOne(models.Customer, {
        foreignKey: 'correspondence_address_id',
        as: 'provider'
    });
};

Address.associate = (models) => {
    Address.hasOne(models.Customer, {
        foreignKey: 'permanent_address_id',
        as: 'provider'
    });
};

export default Address;