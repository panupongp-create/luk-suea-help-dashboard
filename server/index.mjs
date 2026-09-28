import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve, sep} from "node:path";
import pg from "pg";
import {rpc} from "./rpc.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 3000);
const pool = new pg.Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "luk_suea",
  user: "app_api",
  password: process.env.APP_DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
});
pool.on("error", error => console.error("Database pool connection lost:", error.message));

const publicFiles = new Set(["index.html", "app.js", "server-client.js", "styles.css", "styles-v2.css", "assets/hero-scout-relief-v1.png", "assets/favicon.svg"]);
const mime = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"};
const streams = new Set();

function respond(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY"});
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function readJson(req) {
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw Object.assign(new Error("ต้องส่ง JSON"), {status: 415});
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw Object.assign(new Error("ข้อมูลมีขนาดใหญ่เกินไป"), {status: 413});
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error("JSON ไม่ถูกต้อง"), {status: 400});
  }
}

async function handleRpc(req, res, name) {
  const spec = Object.hasOwn(rpc, name) ? rpc[name] : null;
  if (!spec) return respond(res, 404, {error: "ไม่พบคำสั่งนี้"});
  const params = await readJson(req);
  const values = spec.args.map(([key, type]) => type === "jsonb" && params[key] != null ? JSON.stringify(params[key]) : (params[key] ?? null));
  const placeholders = spec.args.map(([, type], index) => `$${index + 1}::${type}`).join(", ");
  const sql = spec.rows
    ? `select * from public.${name}(${placeholders})`
    : `select public.${name}(${placeholders}) as value`;
  const result = await pool.query(sql, values);
  return respond(res, 200, {data: spec.rows ? result.rows : result.rows[0]?.value ?? null});
}

async function serveFile(res, pathname) {
  if (pathname === "/config.js") return respond(res, 200, 'window.APP_CONFIG = {BACKEND_MODE: "server"};\n', mime[".js"]);
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  if (!publicFiles.has(relative)) return respond(res, 404, {error: "ไม่พบหน้าเว็บ"});
  const filename = resolve(root, relative);
  if (!filename.startsWith(resolve(root) + sep)) return respond(res, 404, {error: "ไม่พบหน้าเว็บ"});
  const file = await readFile(filename);
  const extension = relative.slice(relative.lastIndexOf("."));
  respond(res, 200, file, mime[extension] || "application/octet-stream");
}

async function handle(req, res) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/healthz") {
      await pool.query("select 1");
      return respond(res, 200, {status: "ok"});
    }
    if (req.method === "GET" && url.pathname === "/api/public-requests") {
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 500, 1), 500);
      const result = await pool.query("select * from public.public_requests order by received_at desc limit $1", [limit]);
      return respond(res, 200, {data: result.rows});
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/rpc/")) return await handleRpc(req, res, url.pathname.slice(9));
    if (req.method === "GET" && url.pathname === "/api/events") {
      res.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no"});
      res.write(": connected\n\n");
      streams.add(res);
      const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
      req.on("close", () => { clearInterval(heartbeat); streams.delete(res); });
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") return await serveFile(res, url.pathname);
    return respond(res, 405, {error: "วิธีเรียกไม่ถูกต้อง"});
  } catch (error) {
    if (error.code === "P0001") return respond(res, 400, {error: error.message});
    if (error.status) return respond(res, error.status, {error: error.message});
    console.error(error);
    return respond(res, 500, {error: "ระบบขัดข้อง กรุณาลองใหม่"});
  }
}

async function listenForUpdates() {
  while (true) {
    const client = new pg.Client({
      host: process.env.PGHOST || "db", port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "luk_suea", user: "app_api", password: process.env.APP_DB_PASSWORD
    });
    try {
      await client.connect();
      await client.query("listen public_request_changed");
      client.on("notification", () => {
        for (const stream of streams) stream.write("data: changed\n\n");
      });
      await new Promise(resolve => { client.on("error", resolve); client.on("end", resolve); });
    } catch (error) {
      console.error("Dashboard listener disconnected:", error.message);
    } finally {
      await client.end().catch(() => {});
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

if (!process.env.APP_DB_PASSWORD) throw new Error("APP_DB_PASSWORD is required");
http.createServer(handle).listen(port, "0.0.0.0", () => console.log(`App listening on ${port}`));
listenForUpdates();
