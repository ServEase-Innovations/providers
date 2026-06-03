import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { syncPostgresDbAliases, requirePostgresDatabaseName } from "./postgresEnv.js";

const dotenvPath =
  process.env.DOTENV_PATH ||
  (process.env.NODE_ENV === "production" ? ".env.prod" : ".env");
dotenv.config({ path: dotenvPath });
syncPostgresDbAliases(process.env);

const dbName = requirePostgresDatabaseName(process.env);
const dbHost =
  process.env.DB_HOST || process.env.POSTGRES_HOST || "127.0.0.1";
const dbPort = Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432);
const dbUser =
  process.env.DB_USER || process.env.POSTGRES_USER || "serveaso";
const dbPassword =
  process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "serveaso";

const isProduction = process.env.NODE_ENV === "production";

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: "postgres",

  logging: false,

  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
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
    freezeTableName: true,
    timestamps: false,
  },
});

export const connectDB = async () => {
  try {
    console.log(
      `ℹ️ Sequelize DB target -> host=${dbHost} port=${dbPort} db=${dbName} user=${dbUser}`
    );
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};
