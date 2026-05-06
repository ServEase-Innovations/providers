import { sequelize } from "../config/database.js";

const statements = [
  // Provider supporting tables used during add/update flows
  `CREATE TABLE IF NOT EXISTS public.provider_weekly_slots (
    id BIGSERIAL PRIMARY KEY,
    serviceproviderid BIGINT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    slot_start TIME NOT NULL,
    slot_end TIME NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_provider_weekly_slots_spid
     ON public.provider_weekly_slots(serviceproviderid)`,
  `ALTER TABLE public.provider_weekly_slots
     ADD CONSTRAINT fk_provider_weekly_slots_serviceprovider
     FOREIGN KEY (serviceproviderid)
     REFERENCES public.serviceprovider(serviceproviderid)
     ON DELETE CASCADE`,

  `CREATE TABLE IF NOT EXISTS public.provider_daily_slots (
    id BIGSERIAL PRIMARY KEY,
    serviceproviderid BIGINT NOT NULL,
    slot_date DATE NOT NULL,
    slot_start TIMESTAMP NOT NULL,
    slot_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_provider_daily_slots_spid_date
     ON public.provider_daily_slots(serviceproviderid, slot_date)`,
  `ALTER TABLE public.provider_daily_slots
     ADD CONSTRAINT fk_provider_daily_slots_serviceprovider
     FOREIGN KEY (serviceproviderid)
     REFERENCES public.serviceprovider(serviceproviderid)
     ON DELETE CASCADE`,

  `CREATE TABLE IF NOT EXISTS public.serviceprovider_roles (
    serviceproviderid BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (serviceproviderid, role)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_serviceprovider_roles_role
     ON public.serviceprovider_roles(role)`,
  `ALTER TABLE public.serviceprovider_roles
     ADD CONSTRAINT fk_serviceprovider_roles_serviceprovider
     FOREIGN KEY (serviceproviderid)
     REFERENCES public.serviceprovider(serviceproviderid)
     ON DELETE CASCADE`,

  // Ensure expected provider columns exist in case PROD schema lags DEV
  `ALTER TABLE public.serviceprovider
     ADD COLUMN IF NOT EXISTS kyctype varchar(255),
     ADD COLUMN IF NOT EXISTS kycnumber varchar(255),
     ADD COLUMN IF NOT EXISTS kycimage text,
     ADD COLUMN IF NOT EXISTS keyfacts boolean,
     ADD COLUMN IF NOT EXISTS bankname varchar(255),
     ADD COLUMN IF NOT EXISTS ifsccode varchar(255),
     ADD COLUMN IF NOT EXISTS accountholdername varchar(255),
     ADD COLUMN IF NOT EXISTS accountnumber varchar(255),
     ADD COLUMN IF NOT EXISTS accounttype varchar(255),
     ADD COLUMN IF NOT EXISTS upiid varchar(255),
     ADD COLUMN IF NOT EXISTS nannycaretypes varchar(255)`,

  // Remove restrictive language check for flexible payloads
  `ALTER TABLE public.serviceprovider
     DROP CONSTRAINT IF EXISTS serviceprovider_languageknown_check`,

  // Fix missing identity defaults observed in PROD
  `CREATE SEQUENCE IF NOT EXISTS public.serviceprovider_seq`,
  `ALTER TABLE public.serviceprovider
     ALTER COLUMN serviceproviderid
     SET DEFAULT nextval('public.serviceprovider_seq')`,
  `ALTER SEQUENCE public.serviceprovider_seq
     OWNED BY public.serviceprovider.serviceproviderid`,
  `SELECT setval(
      'public.serviceprovider_seq',
      COALESCE((SELECT MAX(serviceproviderid) FROM public.serviceprovider), 1),
      true
   )`,

  `CREATE SEQUENCE IF NOT EXISTS public.address_id_seq`,
  `ALTER TABLE public.address
     ALTER COLUMN id
     SET DEFAULT nextval('public.address_id_seq')`,
  `ALTER SEQUENCE public.address_id_seq
     OWNED BY public.address.id`,
  `SELECT setval(
      'public.address_id_seq',
      COALESCE((SELECT MAX(id) FROM public.address), 1),
      true
   )`,
];

export async function patchProviderSchema() {
  console.log("ℹ️ Running provider schema patch...");
  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (error) {
      // Ignore duplicate constraint/index errors; fail for real SQL issues
      if (error?.original?.code === "42710" || error?.original?.code === "42P07") {
        continue;
      }
      throw error;
    }
  }
  console.log("✅ Provider schema patch completed.");
}

if (process.argv[1]?.endsWith("patchProviderSchema.js")) {
  patchProviderSchema()
    .then(async () => {
      await sequelize.close();
    })
    .catch(async (err) => {
      console.error("❌ Provider schema patch failed:", err.message);
      await sequelize.close().catch(() => {});
      process.exit(1);
    });
}
