const COORDINATE = "([+-]?\\d{1,3}(?:\\.\\d+)?)";
const PAIR = new RegExp(`^\\s*(?:loc:)?\\s*${COORDINATE}\\s*,\\s*${COORDINATE}\\s*$`, "i");

function coordinatePair(value) {
  const match = String(value || "").match(PAIR);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? {latitude,longitude} : null;
}

export function isGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "maps.app.goo.gl"
      || (host === "goo.gl" && url.pathname.startsWith("/maps/"))
      || ((host === "google.com" || host === "www.google.com" || host === "maps.google.com"
        || host === "google.co.th" || host === "www.google.co.th" || host === "maps.google.co.th")
        && (url.pathname.startsWith("/maps") || host.startsWith("maps.") || url.searchParams.has("q")));
  } catch { return false; }
}

export function parseMapInput(value) {
  const input = String(value || "").trim();
  if (!input) return {kind:"empty"};
  if (input.length > 2048) return {kind:"invalid",message:"ข้อความยาวเกินไป"};
  const direct = coordinatePair(input);
  if (direct) return {kind:"coordinates",...direct};
  if (/^https?:\/\//i.test(input)) {
    if (!isGoogleMapsUrl(input)) return {kind:"invalid",message:"รองรับเฉพาะลิงก์ Google Maps แบบ HTTPS"};
    const url = new URL(input);
    if (["maps.app.goo.gl","goo.gl"].includes(url.hostname.toLowerCase())) return {kind:"short-link",url:input};
    for (const key of ["query","q","ll","center","destination"]) {
      const query = url.searchParams.get(key);
      const coordinates = coordinatePair(query);
      if (coordinates) return {kind:"coordinates",...coordinates};
    }
    const detail = url.href.match(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/i);
    if (detail) {
      const coordinates = coordinatePair(`${detail[1]},${detail[2]}`);
      if (coordinates) return {kind:"coordinates",...coordinates};
    }
    const viewport = url.pathname.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/);
    if (viewport) {
      const coordinates = coordinatePair(`${viewport[1]},${viewport[2]}`);
      if (coordinates) return {kind:"coordinates",...coordinates};
    }
    for (const key of ["query","q","destination"]) {
      const query = url.searchParams.get(key)?.trim();
      if (query) return {kind:"search",query};
    }
    const place = url.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/);
    if (place) return {kind:"search",query:decodeURIComponent(place[1].replaceAll("+"," "))};
    return {kind:"invalid",message:"ลิงก์นี้ไม่มีพิกัดหรือชื่อสถานที่ให้ปักหมุด"};
  }
  return {kind:"search",query:input};
}
