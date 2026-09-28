import pg from "pg";

// Parent tables precede their foreign-key dependants. These are all app data
// tables defined in the migrations, including password hashes and private
// shelter records. No Supabase auth/storage/system schemas are transferred.
const tables = [
  "subcenters",
  "app_users",
  "app_sessions",
  "central_access_keys",
  "volunteers",
  "operation_teams",
  "operation_team_members",
  "requests",
  "workflow_steps",
  "public_requests",
  "request_assignments",
  "request_team_assignments",
  "shelter_residents"
];
const sequences = ["request_number_seq", "volunteer_number_seq", "team_number_seq", "center_number_seq"];
const replaceTarget = process.argv.includes("--replace");

if (!process.env.SOURCE_DATABASE_URL) throw new Error("SOURCE_DATABASE_URL is required in .env.migration");
if (!process.env.PGPASSWORD) throw new Error("POSTGRES_PASSWORD is required");
if (replaceTarget && process.env.ALLOW_TARGET_REPLACE !== "YES") {
  throw new Error("--replace also requires ALLOW_TARGET_REPLACE=YES; stop the new app and back up its database first");
}

const source = new pg.Client({connectionString: process.env.SOURCE_DATABASE_URL, application_name: "luk_suea_migration_source"});
const target = new pg.Client({
  host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "luk_suea", user: "postgres", password: process.env.PGPASSWORD,
  application_name: "luk_suea_migration_target"
});

function quote(identifier) {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) throw new Error(`Unexpected SQL identifier: ${identifier}`);
  return `"${identifier}"`;
}

async function columns(client, table) {
  const result = await client.query(`select column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name=$1
    order by ordinal_position`, [table]);
  return result.rows;
}

async function copyTable(table) {
  const sourceColumns = await columns(source, table);
  const targetColumns = await columns(target, table);
  if (!sourceColumns.length || JSON.stringify(sourceColumns) !== JSON.stringify(targetColumns)) {
    throw new Error(`Schema differs for public.${table}; stop and reconcile migrations before copying`);
  }
  const names = sourceColumns.map(column => column.column_name);
  await source.query(`declare migration_cursor no scroll cursor for select * from public.${quote(table)}`);
  let copied = 0;
  try {
    while (true) {
      const batch = await source.query("fetch forward 50 from migration_cursor");
      if (!batch.rows.length) break;
      const values = [];
      const groups = batch.rows.map((row, rowIndex) => {
        const placeholders = names.map((name, columnIndex) => {
          const value = row[name];
          const dataType = sourceColumns[columnIndex].data_type;
          values.push((dataType === "json" || dataType === "jsonb") && value != null ? JSON.stringify(value) : value);
          return `$${rowIndex * names.length + columnIndex + 1}`;
        });
        return `(${placeholders.join(",")})`;
      });
      await target.query(`insert into public.${quote(table)} (${names.map(quote).join(",")}) values ${groups.join(",")}`, values);
      copied += batch.rows.length;
    }
  } finally {
    await source.query("close migration_cursor");
  }
  const result = await target.query(`select count(*)::integer as total from public.${quote(table)}`);
  if (result.rows[0].total !== copied) throw new Error(`Count mismatch for ${table}`);
  console.log(`${table}: ${copied}`);
}

try {
  await source.connect();
  await target.connect();
  await source.query("begin isolation level repeatable read read only");
  await target.query("begin");

  const extra = await source.query(`select table_name from information_schema.tables
    where table_schema='public' and table_type='BASE TABLE' order by table_name`);
  const unexpected = extra.rows.map(row => row.table_name).filter(name => !tables.includes(name));
  if (unexpected.length) throw new Error(`Unrecognized source tables: ${unexpected.join(", ")}`);

  if (replaceTarget) {
    await target.query(`truncate ${tables.map(table => `public.${quote(table)}`).join(", ")}`);
    console.log("Existing target app rows cleared inside the transaction");
  } else {
    for (const table of tables) {
      const result = await target.query(`select count(*)::integer as total from public.${quote(table)}`);
      if (result.rows[0].total) throw new Error(`Target public.${table} is not empty; refusing to overwrite existing data`);
    }
  }

  for (const table of tables) {
    // workflow_steps triggers build dashboard rows as a side effect. Replace
    // those temporary rows with the exact source snapshot before copying it.
    if (table === "public_requests") await target.query("delete from public.public_requests");
    await copyTable(table);
  }
  for (const sequence of sequences) {
    const result = await source.query(`select last_value, is_called from public.${quote(sequence)}`);
    const {last_value, is_called} = result.rows[0];
    await target.query("select setval($1::regclass,$2,$3)", [`public.${sequence}`, last_value, is_called]);
  }
  // Rebuild the public projection from its source tables. This also clears
  // stale team labels if a team was removed directly in the old database.
  await target.query("select public.refresh_public_request(id) from public.requests");
  await target.query("commit");
  await source.query("commit");
  console.log("Data copy committed; all table counts matched. Keep the source active until the final cutover.");
} catch (error) {
  await target.query("rollback").catch(() => {});
  await source.query("rollback").catch(() => {});
  console.error(`Data copy failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await target.end().catch(() => {});
  await source.end().catch(() => {});
}
