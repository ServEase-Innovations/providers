import pg from "pg";

const { Client } = pg;

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

const buildConfig = (prefix) => ({
  host: process.env[`${prefix}_DB_HOST`],
  port: Number(process.env[`${prefix}_DB_PORT`] || 5432),
  user: process.env[`${prefix}_DB_USER`],
  password: process.env[`${prefix}_DB_PASSWORD`],
  database: process.env[`${prefix}_DB_NAME`],
  ssl:
    process.env[`${prefix}_DB_SSL`] === "true"
      ? { require: true, rejectUnauthorized: false }
      : undefined,
});

const requiredKeys = (prefix) => [
  `${prefix}_DB_HOST`,
  `${prefix}_DB_PORT`,
  `${prefix}_DB_USER`,
  `${prefix}_DB_PASSWORD`,
  `${prefix}_DB_NAME`,
];

const validateConfig = (prefix) => {
  const missing = requiredKeys(prefix).filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing env for ${prefix}: ${missing.join(", ")}`);
  }
};

async function listPublicTables(client) {
  const { rows } = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return rows.map((r) => r.table_name);
}

async function listPublicSequences(client) {
  const { rows } = await client.query(
    `SELECT sequence_name
     FROM information_schema.sequences
     WHERE sequence_schema = 'public'
     ORDER BY sequence_name`
  );
  return rows.map((r) => r.sequence_name);
}

async function getSequenceDDL(client, sequenceName) {
  const { rows } = await client.query(
    `SELECT
       data_type,
       start_value,
       minimum_value,
       maximum_value,
       increment,
       cycle_option
     FROM information_schema.sequences
     WHERE sequence_schema = 'public' AND sequence_name = $1`,
    [sequenceName]
  );

  if (!rows.length) return null;
  const s = rows[0];
  const clauses = [
    `AS ${s.data_type}`,
    `START WITH ${s.start_value}`,
    `INCREMENT BY ${s.increment}`,
    `MINVALUE ${s.minimum_value}`,
    `MAXVALUE ${s.maximum_value}`,
    s.cycle_option === "YES" ? "CYCLE" : "NO CYCLE",
  ];

  return `CREATE SEQUENCE IF NOT EXISTS public.${q(sequenceName)} ${clauses.join(
    " "
  )};`;
}

async function getColumnDefs(client, tableName) {
  const { rows } = await client.query(
    `SELECT
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull AS not_null,
       pg_get_expr(ad.adbin, ad.adrelid) AS default_value
     FROM pg_attribute a
     JOIN pg_class c ON a.attrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE n.nspname = 'public'
       AND c.relname = $1
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY a.attnum`,
    [tableName]
  );
  return rows;
}

async function getConstraints(client, tableName) {
  const { rows } = await client.query(
    `SELECT conname, contype, pg_get_constraintdef(oid) AS constraint_def
     FROM pg_constraint
     WHERE conrelid = ('public.' || quote_ident($1))::regclass`,
    [tableName]
  );
  return rows;
}

async function getIndexes(client, tableName) {
  const { rows } = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1`,
    [tableName]
  );
  return rows;
}

async function createMissingTablesAndSequences(source, target) {
  const [sourceTables, targetTables, sourceSequences, targetSequences] =
    await Promise.all([
      listPublicTables(source),
      listPublicTables(target),
      listPublicSequences(source),
      listPublicSequences(target),
    ]);

  const targetTableSet = new Set(targetTables);
  const targetSequenceSet = new Set(targetSequences);

  for (const seq of sourceSequences) {
    if (targetSequenceSet.has(seq)) continue;
    const ddl = await getSequenceDDL(source, seq);
    if (!ddl) continue;
    await target.query(ddl);
    console.log(`+ sequence: ${seq}`);
  }

  for (const table of sourceTables) {
    if (targetTableSet.has(table)) continue;
    const cols = await getColumnDefs(source, table);
    if (!cols.length) continue;

    const colDefs = cols.map((c) => {
      const parts = [q(c.column_name), c.data_type];
      if (c.default_value != null) parts.push(`DEFAULT ${c.default_value}`);
      if (c.not_null) parts.push("NOT NULL");
      return parts.join(" ");
    });

    const createSql = `CREATE TABLE IF NOT EXISTS public.${q(
      table
    )} (\n  ${colDefs.join(",\n  ")}\n);`;
    await target.query(createSql);
    console.log(`+ table: ${table}`);
  }
}

async function applyConstraintsAndIndexes(source, target) {
  const targetTables = await listPublicTables(target);

  for (const table of targetTables) {
    const constraints = await getConstraints(source, table).catch(() => []);
    const indexes = await getIndexes(source, table).catch(() => []);

    for (const c of constraints.filter((x) => x.contype !== "f")) {
      const sql = `ALTER TABLE public.${q(table)} ADD CONSTRAINT ${q(
        c.conname
      )} ${c.constraint_def};`;
      try {
        await target.query(sql);
      } catch {
        // likely exists already; skip
      }
    }

    for (const idx of indexes) {
      let indexSql = idx.indexdef;
      indexSql = indexSql.replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS ");
      indexSql = indexSql.replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ");
      try {
        await target.query(indexSql);
      } catch {
        // index may depend on unavailable extension or already exist
      }
    }
  }

  // Foreign keys second pass
  for (const table of targetTables) {
    const constraints = await getConstraints(source, table).catch(() => []);
    for (const c of constraints.filter((x) => x.contype === "f")) {
      const sql = `ALTER TABLE public.${q(table)} ADD CONSTRAINT ${q(
        c.conname
      )} ${c.constraint_def};`;
      try {
        await target.query(sql);
      } catch {
        // likely exists or dependency issue; skip
      }
    }
  }
}

async function repairPrimaryKeyDefaults(source, target) {
  const { rows: pkRows } = await source.query(
    `SELECT
       tc.table_name,
       kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY tc.table_name`
  );

  for (const pk of pkRows) {
    const table = pk.table_name;
    const column = pk.column_name;

    const [{ rows: sourceCol }, { rows: targetCol }] = await Promise.all([
      source.query(
        `SELECT
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
           pg_get_expr(ad.adbin, ad.adrelid) AS default_value
         FROM pg_attribute a
         JOIN pg_class c ON a.attrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
         WHERE n.nspname = 'public' AND c.relname = $1 AND a.attname = $2`,
        [table, column]
      ),
      target.query(
        `SELECT
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
           pg_get_expr(ad.adbin, ad.adrelid) AS default_value
         FROM pg_attribute a
         JOIN pg_class c ON a.attrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
         WHERE n.nspname = 'public' AND c.relname = $1 AND a.attname = $2`,
        [table, column]
      ),
    ]);

    if (!sourceCol.length || !targetCol.length) continue;

    const src = sourceCol[0];
    const tgt = targetCol[0];
    const srcDefault = src.default_value || "";
    const tgtDefault = tgt.default_value || "";
    const type = String(src.data_type || "").toLowerCase();

    const expectsSequence =
      srcDefault.includes("nextval(") ||
      type === "integer" ||
      type === "bigint" ||
      type === "smallint";
    const hasSequenceDefault = tgtDefault.includes("nextval(");

    if (!expectsSequence || hasSequenceDefault) continue;

    const seqName = `${table}_${column}_seq`;
    await target.query(
      `CREATE SEQUENCE IF NOT EXISTS public.${q(seqName)};`
    );
    await target.query(
      `ALTER TABLE public.${q(table)}
       ALTER COLUMN ${q(column)}
       SET DEFAULT nextval('public.${seqName}');`
    );
    await target.query(
      `ALTER SEQUENCE public.${q(seqName)}
       OWNED BY public.${q(table)}.${q(column)};`
    );
    await target.query(
      `SELECT setval('public.${seqName}',
        COALESCE((SELECT MAX(${q(column)}) FROM public.${q(table)}), 1),
        true);`
    );
    console.log(`~ repaired PK default: ${table}.${column} -> ${seqName}`);
  }
}

export async function bootstrapSchemaFromDevDb() {
  validateConfig("SOURCE");
  validateConfig("TARGET");

  const source = new Client(buildConfig("SOURCE"));
  const target = new Client(buildConfig("TARGET"));

  try {
    await source.connect();
    await target.connect();
    await createMissingTablesAndSequences(source, target);
    await applyConstraintsAndIndexes(source, target);
    await repairPrimaryKeyDefaults(source, target);
    console.log("✅ Schema bootstrap completed.");
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("bootstrapFromDevDb.js")) {
  bootstrapSchemaFromDevDb().catch((err) => {
    console.error("❌ Schema bootstrap failed:", err.message);
    process.exit(1);
  });
}
