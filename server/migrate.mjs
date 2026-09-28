import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import pg from "pg";
import {rpc} from "./rpc.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = [
  "schema.sql",
  "migration-002-two-systems.sql",
  "migration-003-staff-login.sql",
  "migration-004-team-assignment.sql",
  "migration-005-center-team-dispatch.sql",
  "migration-006-subcenter-team-management.sql",
  "migration-007-subcenter-team-dispatch.sql",
  "migration-008-thai-id-and-phone-validation.sql",
  "migration-009-allow-editing-legacy-volunteers.sql",
  "migration-010-shelter-residents.sql",
  "migration-011-optional-request-organization.sql",
  "migration-012-delete-shelter-resident.sql"
];

if (!process.env.PGPASSWORD || !process.env.APP_DB_PASSWORD) throw new Error("POSTGRES_PASSWORD and APP_DB_PASSWORD are required");
const client = new pg.Client({
  host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "luk_suea", user: "postgres", password: process.env.PGPASSWORD
});

try {
  await client.connect();
  await client.query("create schema if not exists extensions");
  await client.query(`do $$ begin
    if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname='app_api') then create role app_api login; end if;
  end $$`);
  await client.query("create table if not exists public.app_schema_migrations (filename text primary key, checksum text not null, applied_at timestamptz not null default now())");

  for (const filename of files) {
    const original = await readFile(`${root}supabase/${filename}`, "utf8");
    const checksum = createHash("sha256").update(original).digest("hex");
    const applied = await client.query("select checksum from public.app_schema_migrations where filename=$1", [filename]);
    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum) throw new Error(`Migration changed after application: ${filename}`);
      continue;
    }
    // The existing migration files remain usable on Supabase. A fresh,
    // self-hosted Postgres instead installs pgcrypto in extensions. Dashboard
    // updates use LISTEN/NOTIFY rather than Supabase logical replication.
    const sql = original
      .replaceAll("create extension if not exists pgcrypto;", "create extension if not exists pgcrypto with schema extensions;")
      .replace(/do \$\$ begin\s+alter publication supabase_realtime add table public\.public_requests;\s+exception when duplicate_object then null; end \$\$;/i, "");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.app_schema_migrations(filename,checksum) values($1,$2)", [filename, checksum]);
      await client.query("commit");
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${filename}: ${error.message}`, {cause: error});
    }
  }

  await client.query("begin");
  try {
    const passwordCommand = await client.query("select format('alter role app_api login password %L', $1::text) as sql", [process.env.APP_DB_PASSWORD]);
    await client.query(passwordCommand.rows[0].sql);
    await client.query("revoke all on all tables in schema public from public");
    await client.query("revoke all on all sequences in schema public from public");
    await client.query("revoke all on all functions in schema public from public");
    await client.query("grant usage on schema public to app_api");
    await client.query("grant select on public.public_requests to app_api");
    await client.query("drop policy if exists app_api_dashboard_read on public.public_requests");
    await client.query("create policy app_api_dashboard_read on public.public_requests for select to app_api using (true)");
    for (const [name, spec] of Object.entries(rpc)) {
      const signature = `public.${name}(${spec.args.map(([, type]) => type).join(",")})`;
      const result = await client.query("select to_regprocedure($1) as routine", [signature]);
      if (!result.rows[0].routine) throw new Error(`Missing RPC: ${signature}`);
      await client.query(`grant execute on function ${signature} to app_api`);
    }
    await client.query(`create or replace function public.notify_public_request_changed()
      returns trigger language plpgsql as $$
      begin perform pg_notify('public_request_changed', TG_OP); return coalesce(new,old); end $$`);
    await client.query("revoke all on function public.notify_public_request_changed() from public");
    await client.query("drop trigger if exists public_request_notify on public.public_requests");
    await client.query(`create trigger public_request_notify after insert or update or delete
      on public.public_requests for each row execute function public.notify_public_request_changed()`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  console.log("Schema and API permissions are ready");
} finally {
  await client.end();
}
