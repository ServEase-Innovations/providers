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
     ADD COLUMN IF NOT EXISTS alternateno bigint,
     ADD COLUMN IF NOT EXISTS bankname varchar(255),
     ADD COLUMN IF NOT EXISTS ifsccode varchar(255),
     ADD COLUMN IF NOT EXISTS accountholdername varchar(255),
     ADD COLUMN IF NOT EXISTS accountnumber varchar(255),
     ADD COLUMN IF NOT EXISTS accounttype varchar(255),
     ADD COLUMN IF NOT EXISTS upiid varchar(255),
     ADD COLUMN IF NOT EXISTS nannycaretypes varchar(255)`,
  // Some environments still have legacy quoted camelCase column "alternateNo".
  // Backfill into lowercase alternateno so current model mappings work.
  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'serviceprovider'
         AND column_name = 'alternateNo'
     ) THEN
       EXECUTE 'UPDATE public.serviceprovider
                  SET alternateno = COALESCE(alternateno, "alternateNo")
                WHERE "alternateNo" IS NOT NULL';
       EXECUTE 'ALTER TABLE public.serviceprovider DROP COLUMN IF EXISTS "alternateNo"';
     END IF;
   END $$`,

  // Remove restrictive language check for flexible payloads
  `ALTER TABLE public.serviceprovider
     DROP CONSTRAINT IF EXISTS serviceprovider_languageknown_check`,

];

async function isIdentityColumn(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
        AND column_name = :columnName`,
    { replacements: { tableName, columnName } }
  );
  return rows?.[0]?.is_identity === "YES";
}

async function ensureSequenceDefault({
  tableName,
  columnName,
  sequenceName,
  maxValueExpression,
}) {
  const identity = await isIdentityColumn(tableName, columnName);
  if (identity) {
    console.log(
      `ℹ️ Skipping sequence default patch for ${tableName}.${columnName} (identity column).`
    );
    return;
  }

  await sequelize.query(`CREATE SEQUENCE IF NOT EXISTS public.${sequenceName}`);
  await sequelize.query(
    `ALTER TABLE public.${tableName}
       ALTER COLUMN ${columnName}
       SET DEFAULT nextval('public.${sequenceName}')`
  );
  await sequelize.query(
    `ALTER SEQUENCE public.${sequenceName}
       OWNED BY public.${tableName}.${columnName}`
  );
  await sequelize.query(
    `SELECT setval(
      'public.${sequenceName}',
      COALESCE((SELECT MAX(${maxValueExpression}) FROM public.${tableName}), 1),
      true
    )`
  );
}

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

  // Fix missing sequence defaults where PKs are not identity columns.
  await ensureSequenceDefault({
    tableName: "serviceprovider",
    columnName: "serviceproviderid",
    sequenceName: "serviceprovider_seq",
    maxValueExpression: "serviceproviderid",
  });
  await ensureSequenceDefault({
    tableName: "address",
    columnName: "id",
    sequenceName: "address_id_seq",
    maxValueExpression: "id",
  });

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
