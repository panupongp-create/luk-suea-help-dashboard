import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

// Import a one-row CSV downloaded from Supabase SQL Editor. The corresponding
// SELECT aggregates all app tables into a single JSON value, so the editor's
// 100-row result limit cannot silently omit rows. This never contacts Supabase.
const tables = [
  "subcenters", "app_users", "app_sessions", "central_access_keys",
  "volunteers", "operation_teams", "operation_team_members", "requests",
  "workflow_steps", "public_requests", "request_assignments",
  "request_team_assignments", "shelter_residents"
];
const sequences = ["request_number_seq", "volunteer_number_seq", "team_number_seq", "center_number_seq"];
const expectedProject = "cfwjnjyscpaorebgchsy";
const replaceTarget = process.argv.includes("--replace");
const inspectOnly = process.argv.includes("--inspect");
const input = process.argv.find((arg, index) => index > 1 && !arg.startsWith("--"));

if (!input) throw new Error("Usage: node server/import-snapshot.mjs <snapshot.csv> [--inspect | --replace]");
if (replaceTarget && inspectOnly) throw new Error("Choose either --inspect or --replace");
if (replaceTarget && process.env.ALLOW_TARGET_REPLACE !== "YES") {
  throw new Error("--replace requires ALLOW_TARGET_REPLACE=YES after stopping the app and backing up the target");
}

function parseSingleColumnCsv(csv) {
  const text = csv.replace(/^\uFEFF/, "");
  const headerEnd = text.indexOf("\n");
  if (headerEnd < 0 || text.slice(0, headerEnd).trim() !== "snapshot") {
    throw new Error("Expected a Supabase SQL Editor CSV with one snapshot column");
  }
  const body = text.slice(headerEnd + 1).trim();
  if (!body.startsWith('"')) return body;
  let value = "";
  let end = -1;
  for (let i = 1; i < body.length; i++) {
    if (body[i] !== '"') {
      value += body[i];
    } else if (body[i + 1] === '"') {
      value += '"';
      i++;
    } else {
      end = i;
      break;
    }
  }
  if (end < 0 || body.slice(end + 1).trim()) throw new Error("CSV is incomplete or contains multiple rows");
  return value;
}

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function quote(identifier) {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) throw new Error("Invalid SQL identifier");
  return `"${identifier}"`;
}

const csv = readFileSync(input, "utf8");
const snapshot = JSON.parse(parseSingleColumnCsv(csv));
if (snapshot.format !== "luk-suea-snapshot-v1" || snapshot.project_ref !== expectedProject) {
  throw new Error("Snapshot format or source project does not match this application");
}
if (!snapshot.tables || !sameNames(Object.keys(snapshot.tables), tables)) {
  throw new Error("Snapshot does not contain exactly the expected app tables");
}
if (!snapshot.sequences || !sameNames(Object.keys(snapshot.sequences), sequences)) {
  throw new Error("Snapshot does not contain exactly the expected sequences");
}
for (const table of tables) {
  if (!Array.isArray(snapshot.tables[table]) || snapshot.tables[table].some(row => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new Error(`Invalid rows in ${table}`);
  }
}
for (const sequence of sequences) {
  const value = snapshot.sequences[sequence];
  if (!value || !/^\d+$/.test(value.last_value) || typeof value.is_called !== "boolean") {
    throw new Error(`Invalid sequence ${sequence}`);
  }
}

console.log(`Snapshot SHA-256: ${createHash("sha256").update(csv).digest("hex")}`);
console.log(`Source project: ${snapshot.project_ref}; exported: ${snapshot.exported_at}`);
for (const table of tables) console.log(`${table}: ${snapshot.tables[table].length}`);
if (inspectOnly) process.exit(0);
if (!process.env.PGPASSWORD) throw new Error("POSTGRES_PASSWORD is required");

const {default: pg} = await import("pg");
const target = new pg.Client({
  host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "luk_suea", user: "postgres", password: process.env.PGPASSWORD,
  application_name: "luk_suea_snapshot_import"
});

async function columns(table) {
  const result = await target.query(`select column_name, data_type from information_schema.columns
    where table_schema='public' and table_name=$1 order by ordinal_position`, [table]);
  return result.rows;
}

async function insertTable(table) {
  const rows = snapshot.tables[table];
  const schema = await columns(table);
  if (!schema.length) throw new Error(`Missing target table public.${table}`);
  const names = schema.map(column => column.column_name);
  if (rows.some(row => !sameNames(Object.keys(row), names))) {
    throw new Error(`Snapshot columns differ from target public.${table}`);
  }
  if (table === "public_requests") await target.query("delete from public.public_requests");
  for (let offset = 0; offset < rows.length; offset += 50) {
    const batch = rows.slice(offset, offset + 50);
    const values = [];
    const groups = batch.map((row, rowIndex) => {
      const placeholders = schema.map((column, columnIndex) => {
        const value = row[column.column_name];
        values.push((column.data_type === "json" || column.data_type === "jsonb") && value != null ? JSON.stringify(value) : value);
        return `$${rowIndex * names.length + columnIndex + 1}`;
      });
      return `(${placeholders.join(",")})`;
    });
    await target.query(`insert into public.${quote(table)} (${names.map(quote).join(",")}) values ${groups.join(",")}`, values);
  }
  const actual = await target.query(`select count(*)::integer as total from public.${quote(table)}`);
  if (actual.rows[0].total !== rows.length) throw new Error(`Count mismatch for ${table}`);
}

try {
  await target.connect();
  await target.query("begin");
  if (replaceTarget) {
    await target.query(`truncate ${tables.map(table => `public.${quote(table)}`).join(", ")}`);
    console.log("Target app rows cleared inside transaction");
  } else {
    for (const table of tables) {
      const result = await target.query(`select count(*)::integer as total from public.${quote(table)}`);
      if (result.rows[0].total) throw new Error(`Target public.${table} is not empty; refusing to overwrite`);
    }
  }
  for (const table of tables) await insertTable(table);
  for (const sequence of sequences) {
    const {last_value, is_called} = snapshot.sequences[sequence];
    await target.query("select setval($1::regclass,$2,$3)", [`public.${sequence}`, last_value, is_called]);
  }
  await target.query("select public.refresh_public_request(id) from public.requests");
  const publicCount = await target.query("select count(*)::integer as total from public.public_requests");
  if (publicCount.rows[0].total !== snapshot.tables.public_requests.length) {
    throw new Error("Public dashboard count differs after refresh");
  }
  await target.query("commit");
  console.log("Snapshot imported in one transaction; Supabase source was never connected or changed.");
} catch (error) {
  await target.query("rollback").catch(() => {});
  console.error(`Snapshot import failed; target rolled back: ${error.message}`);
  process.exitCode = 1;
} finally {
  await target.end().catch(() => {});
}
