import {isGoogleMapsUrl} from "../map-search.js";

const geocoderUrl = process.env.PLACE_SEARCH_URL || "https://nominatim.openstreetmap.org/search";
const suggestionUrl = process.env.PLACE_SUGGEST_URL || "https://photon.komoot.io/api/";
const cache = new Map();
const inFlight = new Map();
const suggestionCache = new Map();
const suggestionInFlight = new Map();
let queue = Promise.resolve();
let queued = 0;
let nextSearchAt = 0;
let suggestionQueue = Promise.resolve();
let queuedSuggestions = 0;
let nextSuggestionAt = 0;

function publicError(message, status = 400) {
  return Object.assign(new Error(message), {status});
}

export async function searchPlaces(rawQuery) {
  const query = String(rawQuery || "").trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > 140) throw publicError("ระบุชื่อสถานที่ 2–140 ตัวอักษร");
  const key = query.toLocaleLowerCase("th-TH");
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.places;
  if (inFlight.has(key)) return inFlight.get(key);
  if (queued >= 8) throw publicError("มีผู้ค้นหาพร้อมกันมาก กรุณาลองใหม่สักครู่", 429);

  queued++;
  const task = queue.then(async () => {
    const delay = Math.max(0, nextSearchAt - Date.now());
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    nextSearchAt = Date.now() + 1100;
    const url = new URL(geocoderUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "th");
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "th,en;q=0.8",
        "User-Agent": "LukSueaHelp/1.0 (https://ager_dd-01.moe.go.th/; place search)",
        "Referer": "https://ager_dd-01.moe.go.th/"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw publicError("บริการค้นหาสถานที่ไม่พร้อมใช้งาน กรุณาลองใหม่หรือคลิกปักหมุดบนแผนที่", 502);
    const data = await response.json();
    if (!Array.isArray(data)) throw publicError("ผลการค้นหาสถานที่ไม่ถูกต้อง", 502);
    const places = data.slice(0, 5).flatMap(item => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      const name = String(item.display_name || "").slice(0, 500);
      return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude)
        && Math.abs(longitude) <= 180 && name ? [{name,latitude,longitude}] : [];
    });
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(key, {places,expires:Date.now() + 24*60*60*1000});
    return places;
  });
  queue = task.catch(() => {});
  inFlight.set(key, task);
  try { return await task; }
  finally { queued--; inFlight.delete(key); }
}

export async function suggestPlaces(rawQuery) {
  const query = String(rawQuery || "").trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 140) throw publicError("ระบุชื่อสถานที่อย่างน้อย 3 ตัวอักษร");
  const key = query.toLocaleLowerCase("th-TH");
  const saved = suggestionCache.get(key);
  if (saved && saved.expires > Date.now()) return saved.places;
  if (suggestionInFlight.has(key)) return suggestionInFlight.get(key);
  if (queuedSuggestions >= 5) throw publicError("มีผู้ค้นหาพร้อมกันมาก กรุณาลองใหม่สักครู่", 429);

  queuedSuggestions++;
  const task = suggestionQueue.then(async () => {
    const delay = Math.max(0, nextSuggestionAt - Date.now());
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    nextSuggestionAt = Date.now() + 900;
    const url = new URL(suggestionUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycode", "TH");
    const response = await fetch(url, {
      headers: {"Accept":"application/json", "Accept-Language":"th,en;q=0.8", "User-Agent":"LukSueaHelp/1.0 (https://ager_dd-01.moe.go.th/; place suggestions)"},
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw publicError("บริการแนะนำสถานที่ไม่พร้อมใช้งาน กรุณากดค้นหาหรือปักหมุดบนแผนที่", 502);
    const data = await response.json();
    if (!Array.isArray(data?.features)) throw publicError("ผลการแนะนำสถานที่ไม่ถูกต้อง", 502);
    const places = data.features.slice(0, 5).flatMap(feature => {
      const latitude = Number(feature?.geometry?.coordinates?.[1]);
      const longitude = Number(feature?.geometry?.coordinates?.[0]);
      const properties = feature?.properties || {};
      const parts = [properties.name, properties.street, properties.district, properties.city, properties.county, properties.state]
        .map(part => String(part || "").trim().replace(/[,，]+$/u, ""))
        .filter((part,index,all) => part && all.indexOf(part) === index);
      const name = parts.join(", ").slice(0, 500);
      return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude)
        && Math.abs(longitude) <= 180 && name ? [{name,latitude,longitude}] : [];
    });
    if (suggestionCache.size >= 200) suggestionCache.delete(suggestionCache.keys().next().value);
    suggestionCache.set(key, {places,expires:Date.now() + 10*60*1000});
    return places;
  });
  suggestionQueue = task.catch(() => {});
  suggestionInFlight.set(key, task);
  try { return await task; }
  finally { queuedSuggestions--; suggestionInFlight.delete(key); }
}

export async function expandGoogleMapsUrl(rawUrl) {
  if (String(rawUrl || "").length > 2048 || !isGoogleMapsUrl(rawUrl)) {
    throw publicError("รองรับเฉพาะลิงก์ Google Maps แบบ HTTPS");
  }
  let url = new URL(rawUrl);
  if (url.username || url.password || url.port) throw publicError("ลิงก์ Google Maps ไม่ถูกต้อง");
  for (let hop = 0; hop < 5; hop++) {
    if (!["maps.app.goo.gl", "goo.gl"].includes(url.hostname.toLowerCase())) return url.href;
    const response = await fetch(url, {method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(8000)});
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (!location) throw publicError("เปิดลิงก์สั้นไม่ได้ กรุณาคัดลอกลิงก์เต็มจาก Google Maps", 422);
    url = new URL(location, url);
    if (!isGoogleMapsUrl(url.href) || url.username || url.password || url.port) {
      throw publicError("ปลายทางของลิงก์ไม่ใช่ Google Maps", 422);
    }
  }
  throw publicError("ลิงก์ Google Maps เปลี่ยนปลายทางหลายครั้งเกินไป", 422);
}
