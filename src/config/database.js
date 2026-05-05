import { Sequelize } from "sequelize";
import dotenv from "dotenv";

const dotenvPath =
  process.env.DOTENV_PATH ||
  (process.env.NODE_ENV === "production" ? ".env.prod" : ".env");
dotenv.config({ path: dotenvPath });

const isProduction = process.env.NODE_ENV === "production";

export const sequelize = new Sequelize(
 process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",

    logging: false, // change to console.log if debugging

    pool: {
      max: 10,        // max connections
      min: 0,
      acquire: 30000, // max time (ms) to get connection
      idle: 10000,    // max time (ms) connection can be idle
    },

    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},

    define: {
      freezeTableName: true, // prevents plural table names
      timestamps: false,
    },
  }
);

export const connectDB = async () => {
  try {
    console.log(
      `ℹ️ Sequelize DB target -> host=${process.env.DB_HOST} port=${
        Number(process.env.DB_PORT) || 5432
      } db=${process.env.DB_NAME} user=${process.env.DB_USER}`
    );
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};