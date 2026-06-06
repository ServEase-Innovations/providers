import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  syncPostgresDbAliases,
  requirePostgresDatabaseName,
  loadMonorepoPostgresEnv,
} from "./postgresEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(__dirname, "../..");

function loadProviderEnv() {
  const nodeEnv = process.env.NODE_ENV || "development";

  const serviceEnvPath = path.join(serviceRoot, `.env.${nodeEnv}`);
  const serviceFallback = path.join(serviceRoot, ".env");

  if (fs.existsSync(serviceEnvPath)) {
    dotenv.config({ path: serviceEnvPath, override: false });
  } else if (fs.existsSync(serviceFallback)) {
    dotenv.config({ path: serviceFallback, override: false });
  }

  const { loaded } = loadMonorepoPostgresEnv();
  if (loaded.length) {
    console.log("✔ Loaded monorepo postgres env:", loaded.join(", "));
  }

  if (process.env.DOTENV_PATH && fs.existsSync(process.env.DOTENV_PATH)) {
    dotenv.config({ path: process.env.DOTENV_PATH, override: true });
  }

  syncPostgresDbAliases(process.env);
}

loadProviderEnv();

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
