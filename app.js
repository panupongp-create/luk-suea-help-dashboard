import { createServerClient } from "./server-client.js";

const config = window.APP_CONFIG || {};
const selfHosted = config.BACKEND_MODE === "server";
const online = selfHosted || Boolean(config.SUPABASE_URL && config.SUPABASE_PUBLISHABLE_KEY);
const supabase = selfHosted
  ? createServerClient()
  : online
    ? (await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm")).createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY)
    : null;
const CENTRAL_NAME = "ศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อ";
const normalizeCentralName = value => String(value ?? "").replaceAll("ศูนย์ส่วนกลาง", CENTRAL_NAME).replaceAll("ศูนย์กลาง", CENTRAL_NAME);

const GROUPS = [
  "บุคลากรสำนักงานลูกเสือแห่งชาติ",
  "บุคลากรทางการลูกเสือและผู้บังคับบัญชาลูกเสือ",
  "วิทยากรฝึกอบรมด้านการบุกเบิกและผู้มีทักษะเฉพาะ",
  "สโมสรลูกเสือ",
  "สมาคม หรือ ชมรมลูกเสือ",
  "อาสาสมัครและเครือข่ายสนับสนุนอื่น"
];

const TEAM_TYPES = {
  relief_packing: ["ชุดจัดเตรียมและสนับสนุนสิ่งของช่วยเหลือ", "Scout Relief Packing", "รับ คัดแยก บรรจุ ตรวจนับ ติดป้ายปลายทาง และส่งมอบสิ่งของ"],
  shelter_support: ["ชุดสนับสนุนศูนย์พักพิง", "Scout Shelter Support", "สนับสนุนการลงทะเบียน จัดพื้นที่ แจกอาหาร น้ำดื่ม และงานบริการในศูนย์พักพิง"],
  child_friendly: ["ชุดสนับสนุนเด็กในพื้นที่ปลอดภัย", "Scout Child Friendly Space", "จัดกิจกรรมและพื้นที่ปลอดภัยสำหรับเด็กภายใต้การควบคุมดูแลของผู้ใหญ่"],
  school_recovery: ["ชุดฟื้นฟูสถานศึกษา", "Scout School Recovery", "ขนย้าย คัดแยก ทำความสะอาด และเตรียมสถานศึกษาให้กลับมาเปิดเรียน"]
};

const DEMO_CENTERS = [
  {id:"c1",center_code:"SUB-01",name:"ศูนย์ผินแจ่มวิชาสอน",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
  {id:"c2",center_code:"SUB-02",name:'ศูนย์พัฒนาบุคลากรทางการลูกเสือ ยุวกาชาดและกิจกรรมเยาวชน "กฐิน กุยยกานนท์"',service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
  {id:"c3",center_code:"SUB-03",name:"มัธยมวัดหนองจอก",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
  {id:"c4",center_code:"SUB-04",name:"วิทยาลัยเทคนิคดอนเมือง",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true}
];

const STEP_CATALOG = [
  ["received", "รับคำร้อง", "รับและบันทึกข้อมูลคำร้องขอให้ครบถ้วน"],
  ["verified", "ตรวจสอบ", "ตรวจสอบความครบถ้วนและยืนยันกับผู้ประสานงาน"],
  ["safety", "ประเมินความปลอดภัย", "ประเมินความเสี่ยงของพื้นที่และภารกิจก่อนจัดส่งกำลัง"],
  ["team_type", "กำหนดประเภททีม", "กำหนดชุดปฏิบัติการให้ตรงกับภารกิจที่ร้องขอ"],
  ["staffing", "จัดกำลัง", "คัดเลือกและจัดจำนวนผู้ปฏิบัติงานตามภารกิจ พื้นที่ และช่วงเวลา"],
  ["leader_notified", "แจ้งหัวหน้าทีม", "แจ้งสถานที่ ภารกิจ วันเวลา ผู้ประสานงาน และข้อควรระวัง"],
  ["operating", "เข้าปฏิบัติ", "ชุดปฏิบัติการเข้าพื้นที่ตามภารกิจที่ได้รับมอบหมาย"],
  ["reported", "รายงานผล", "รายงานผล ปัญหา อุปสรรค และความต้องการเพิ่มเติม"]
];

const STATUS = {
  pending: ["รอดำเนินการ", "pending"],
  in_progress: ["กำลังดำเนินการ", "in_progress"],
  blocked: ["ติดปัญหา", "blocked"],
  completed: ["เสร็จสิ้น", "completed"]
};
const PRIORITY = { normal: "ปกติ", urgent: "เร่งด่วน", critical: "ฉุกเฉิน" };

const now = Date.now();
const demoRows = [
  {id:"d1",request_no:"REQ-20260927-00004",requester_type:"agency",requester_name:"โรงเรียนบ้านหนองน้ำใส",received_at:new Date().toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"โรงเรียนบ้านหนองน้ำใส",organization:"สำนักงานเขตพื้นที่การศึกษา",operation_point:"อาคารอเนกประสงค์ด้านทิศตะวันออก | พิกัด: 13.756300, 100.501800 | แผนที่: https://www.google.com/maps/search/?api=1&query=13.756300%2C100.501800",situation:"มีสิ่งของช่วยเหลือเข้ามาจำนวนมากและต้องจัดพื้นที่รับมอบ",impact:"ทางเดินและพื้นที่ใช้งานบางส่วนไม่เพียงพอ",mission:"สนับสนุนการจัดพื้นที่และขนย้ายสิ่งของ",personnel_required:12,operation_start_at:new Date(now+86400000).toISOString(),operation_end_at:new Date(now+118800000).toISOString(),priority:"urgent",coordinator_name:"ผู้ประสานงานโรงเรียน",coordinator_org:"โรงเรียนบ้านหนองน้ำใส",coordinator_phone:"081-000-0001",overall_status:"in_progress",current_step:"จัดกำลัง",completed_steps:4,assigned_center_name:"ศูนย์ประสานงานจังหวัดตัวอย่าง",assigned_team_name:"TEAM-20260928-0001 · ชุดจัดเตรียมและสนับสนุนสิ่งของช่วยเหลือ"},
  {id:"d2",request_no:"REQ-20260927-00003",requester_type:"citizen",requester_name:"ผู้แทนชุมชนริมคลอง",received_at:new Date(now-7200000).toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"ชุมชนริมคลอง",organization:"เทศบาลตำบล",operation_point:"ศาลาชุมชนใกล้สะพาน",situation:"ประชาชนทยอยนำสิ่งของมาบริจาคและการจราจรเริ่มหนาแน่น",impact:"จุดรับบริจาคยังไม่มีระบบคัดแยก",mission:"ช่วยจัดระเบียบพื้นที่และประสานจุดรับบริจาค",personnel_required:18,operation_start_at:new Date(now+18000000).toISOString(),operation_end_at:null,priority:"critical",coordinator_name:"ผู้ใหญ่บ้านตัวอย่าง",coordinator_org:"ชุมชนริมคลอง",coordinator_phone:"081-000-0002",overall_status:"blocked",current_step:"ประเมินความปลอดภัย",completed_steps:2,assigned_team_name:null},
  {id:"d3",request_no:"REQ-20260926-00002",requester_type:"agency",requester_name:"ศูนย์พักพิงชั่วคราว",received_at:new Date(now-86400000).toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"ศูนย์พักพิงชั่วคราว",organization:"องค์การบริหารส่วนตำบล",operation_point:"อาคารประชุมชั้น 1",situation:"มีผู้พักพิงเพิ่มขึ้นต่อเนื่อง",impact:"เจ้าหน้าที่ครัวและผู้กระจายสิ่งของไม่เพียงพอ",mission:"จัดชุดช่วยงานครัวและกระจายสิ่งของ",personnel_required:20,operation_start_at:new Date(now+172800000).toISOString(),operation_end_at:null,priority:"normal",coordinator_name:"เจ้าหน้าที่ศูนย์พักพิง",coordinator_org:"องค์การบริหารส่วนตำบล",coordinator_phone:"081-000-0003",overall_status:"pending",current_step:"ตรวจสอบ",completed_steps:1,assigned_team_name:null}
];

const demoVolunteers = [
  {id:"v1",registration_no:"VOL-20260927-00001",group_no:1,subcenter_id:"c1",scoutdd_id:"SDD-1001",national_id:"1100000000001",full_name:"กิตติพงศ์ ใจอาสา",organization_network:DEMO_CENTERS[0].name,phone:"081-111-1111",operational_areas:"กรุงเทพมหานครและปริมณฑล",skills:"ประสานงาน จัดการคลังสิ่งของ",vehicle:"รถยนต์",equipment:"วิทยุสื่อสาร",availability_details:"พร้อมวันทำการ",active:true},
  {id:"v2",registration_no:"VOL-20260927-00002",group_no:2,subcenter_id:"c2",scoutdd_id:"SDD-1024",national_id:"1100000000002",full_name:"ปภังกร พร้อมช่วย",organization_network:DEMO_CENTERS[1].name,phone:"082-222-2222",operational_areas:"นนทบุรี ปทุมธานี",skills:"ปฐมพยาบาล งานครัว",vehicle:"รถกระบะ",equipment:"ชุดปฐมพยาบาล",availability_details:"เสาร์และอาทิตย์",active:true},
  {id:"v3",registration_no:"VOL-20260927-00003",group_no:3,subcenter_id:"c3",scoutdd_id:"",national_id:"1100000000003",full_name:"ณัฐวุฒิ นักบุกเบิก",organization_network:DEMO_CENTERS[2].name,phone:"083-333-3333",operational_areas:"ภาคกลาง",skills:"บุกเบิก กู้ภัยทางน้ำ",vehicle:"เรือท้องแบน",equipment:"เชือก เสื้อชูชีพ",availability_details:"แจ้งล่วงหน้า 1 วัน",active:true},
  {id:"v4",registration_no:"VOL-20260927-00004",group_no:6,subcenter_id:"c4",scoutdd_id:"",national_id:"1100000000004",full_name:"พรทิพย์ มีน้ำใจ",organization_network:DEMO_CENTERS[3].name,phone:"084-444-4444",operational_areas:"กรุงเทพมหานคร",skills:"ดูแลเด็กและงานทะเบียน",vehicle:"",equipment:"โน้ตบุ๊ก",availability_details:"ทุกวันหลัง 17.00 น.",active:true}
];

let requestRows = [];
let dashboardRole = "public";
let dashboardPage = 0;
let dashboardMap = null;
let dashboardMapMarkers = null;
const DASHBOARD_PAGE_SIZE = 5;
let volunteerStats = [];
let publicCenters = [...DEMO_CENTERS];
let centralState = null;
let subcenterSession = null;
let shelterRecords = [];
let shelterPage = 0;
const SHELTER_PAGE_SIZE = 10;
const demoShelterRecords = [];
let realtimeChannel = null;
let operationMap = null;
let operationMarker = null;
let requestDetailMap = null;
let requestDetailMarker = null;
let demoRequestCounter = 5;
let demoVolunteerCounter = demoVolunteers.length + 1;
const demoManage = new Map();
const SESSION_KEY = "luk_suea_staff_session";
let authSession = null;
let volunteerPage = 0;
const VOLUNTEERS_PER_PAGE = 5;
let dispatchTeamsExpanded = false;
const dispatchExpandedCenters = new Set();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const formatDate = value => value ? new Intl.DateTimeFormat("th-TH", {dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "–";
const toLocalInput = date => { const value = new Date(date); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0,16); };
const normalizeRpcResult = data => Array.isArray(data) ? data[0] : data;

function showToast(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.style.background = error ? "#9d3131" : "#0b2f47";
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3800);
}

function setConnectionState(state) {
  $$(".live-badge").forEach(badge => badge.classList.toggle("connected", state === "connected"));
  const label = $("#live-label");
  if (label) label.textContent = state === "connected" ? "เชื่อมต่อฐานข้อมูลแล้ว" : online ? "กำลังเชื่อมต่อ" : "ข้อมูลตัวอย่าง";
}

function routeInfo() {
  const raw = location.hash.replace(/^#/, "") || "home";
  if (raw === "center" || raw.startsWith("center/")) return {name:"center",raw};
  if (raw === "dispatch" || raw.startsWith("dispatch/")) return {name:"dispatch",raw};
  if (raw.startsWith("subcenter/mission/")) return {name:"subcenter-mission",raw};
  if (raw === "subcenter" || raw.startsWith("subcenter/")) return {name:"subcenter",raw};
  if (raw.startsWith("manage/")) return {name:"manage",raw};
  return {name:raw,raw};
}

function route() {
  const info = routeInfo();
  const allowed = ["home","registry","dashboard","new","login","center","dispatch","subcenter","subcenter-mission","shelter","manage"];
  let name = allowed.includes(info.name) ? info.name : "home";
  if (["center","dispatch","subcenter","subcenter-mission","shelter"].includes(name) && !authSession) {
    location.hash = "login";
    return;
  }
  if (["center","dispatch"].includes(name) && authSession?.role !== "central") {
    location.hash = "subcenter";
    return;
  }
  if (["subcenter","subcenter-mission","shelter"].includes(name) && authSession?.role !== "subcenter") {
    location.hash = "center";
    return;
  }
  if (name === "login" && authSession) {
    location.hash = authSession.role === "central" ? "center" : "subcenter";
    return;
  }
  $$(".view").forEach(view => { view.hidden = view.id !== `${name}-view`; });
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === (name === "subcenter-mission" ? "subcenter" : name)));
  if (name === "registry") loadRegistry();
  if (name === "dashboard") loadDashboard();
  if (name === "new") {
    setRequestDefaults();
    requestAnimationFrame(() => {
      initializeOperationMap();
      operationMap?.invalidateSize();
    });
  }
  if (["center","dispatch"].includes(name)) loadCentral(name);
  if (name === "subcenter") loadSubcenter();
  if (name === "subcenter-mission") loadSubcenterMission(info.raw);
  if (name === "shelter") loadShelter();
  if (name === "manage") loadManage(info.raw);
  window.scrollTo({top:0,behavior:"smooth"});
}

function applyAuthUi() {
  const loginLink = $("#login-nav");
  const logoutButton = $("#logout-button");
  const isCentral = authSession?.role === "central";
  const isSubcenter = authSession?.role === "subcenter";
  $$(".public-nav").forEach(link => { link.hidden = Boolean(authSession); });
  $$(".central-nav").forEach(link => { link.hidden = !isCentral; });
  $$(".subcenter-nav").forEach(link => { link.hidden = !isSubcenter; });
  $("#staff-dashboard-nav").hidden = !authSession;
  if (authSession) {
    logoutButton.hidden = false;
  } else {
    loginLink.textContent = "เข้าสู่ระบบเจ้าหน้าที่";
    loginLink.removeAttribute("title");
    loginLink.href = "#login";
    loginLink.dataset.route = "login";
    logoutButton.hidden = true;
  }
}

async function restoreSession() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { saved = null; }
  if (!saved?.session_token) { applyAuthUi(); return; }
  try {
    if (online) {
      const {data,error} = await supabase.rpc("get_staff_session", {p_session_token:saved.session_token});
      if (error || !data) throw error || new Error("ไม่พบเซสชัน");
      authSession = {...data,session_token:saved.session_token};
    } else authSession = saved;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    authSession = null;
  }
  applyAuthUi();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#login-button");
  const errorBox = $("#login-error");
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;
  button.disabled = true;
  button.textContent = "กำลังตรวจสอบ…";
  errorBox.hidden = true;
  try {
    let result;
    if (online) {
      const response = await supabase.rpc("login_staff", {p_username:username,p_password:password});
      if (response.error) throw response.error;
      result = response.data;
      if (result?.error) throw new Error(result.error);
    } else {
      const demoCenters = {
        phinjam:["c1","ศูนย์ผินแจ่มวิชาสอน"],
        kathin:["c2",'ศูนย์พัฒนาบุคลากรทางการลูกเสือ ยุวกาชาดและกิจกรรมเยาวชน "กฐิน กุยยกานนท์"'],
        nongchok:["c3","มัธยมวัดหนองจอก"],
        donmueang:["c4","วิทยาลัยเทคนิคดอนเมือง"]
      };
      if (!password || (username !== "central" && !demoCenters[username])) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      result = username === "central"
        ? {session_token:"demo-central",username,display_name:CENTRAL_NAME,role:"central"}
        : {session_token:`demo-${username}`,username,display_name:demoCenters[username][1],role:"subcenter",center_id:demoCenters[username][0],center_name:demoCenters[username][1]};
    }
    if (result.role === "central") result.display_name = CENTRAL_NAME;
    authSession = result;
    localStorage.setItem(SESSION_KEY, JSON.stringify(result));
    applyAuthUi();
    form.reset();
    location.hash = result.role === "central" ? "center" : "subcenter";
    showToast(`เข้าสู่ระบบแล้ว · ${result.display_name}`);
  } catch (error) {
    errorBox.textContent = error.message || "เข้าสู่ระบบไม่สำเร็จ";
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "เข้าสู่ระบบ";
  }
}

async function logoutStaff() {
  const token = authSession?.session_token;
  authSession = null;
  centralState = null;
  subcenterSession = null;
  shelterRecords = [];
  requestRows = [];
  dashboardRole = "public";
  dashboardMap?.closePopup();
  dashboardMapMarkers?.clearLayers();
  resetShelterForm();
  localStorage.removeItem(SESSION_KEY);
  applyAuthUi();
  location.hash = "home";
  if (online && token) await supabase.rpc("logout_staff", {p_session_token:token});
  showToast("ออกจากระบบแล้ว");
}

function initializeStaticOptions() {
  $("#group-selector").innerHTML = GROUPS.map((group,index) => `<label class="group-option"><input type="radio" name="group_no" value="${index+1}" ${index===0?"checked":""} required><span><strong>กลุ่ม ${index+1}</strong>${escapeHtml(group)}</span></label>`).join("");
  $("#volunteer-group-filter").innerHTML += GROUPS.map((group,index) => `<option value="${index+1}">กลุ่ม ${index+1} · ${escapeHtml(group)}</option>`).join("");
  $("#edit-volunteer-group").innerHTML = GROUPS.map((group,index) => `<option value="${index+1}">กลุ่ม ${index+1} · ${escapeHtml(group)}</option>`).join("");
  $("#team-type").innerHTML = Object.entries(TEAM_TYPES).map(([value,item]) => `<option value="${value}">${escapeHtml(item[0])}</option>`).join("");
  setRequestDefaults();
  $("#team-form").elements.operation_start_at.value = toLocalInput(new Date(now + 86400000));
}

function setRequestDefaults() {
  const form = $("#request-form");
  if (!form.elements.received_at.value) form.elements.received_at.value = toLocalInput(new Date());
  if (!form.elements.operation_start_at.value) form.elements.operation_start_at.value = toLocalInput(new Date(now + 86400000));
}

function initializeOperationMap() {
  if (operationMap || !window.L) return;
  operationMap = L.map("operation-map", {scrollWheelZoom:false}).setView([13.7563,100.5018], 6);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(operationMap);
  operationMap.on("click", event => setOperationPin(event.latlng.lat,event.latlng.lng,true));
}

function googleMapsUrl(latitude,longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function setOperationPin(latitude,longitude,focus=false) {
  const lat = Number(latitude).toFixed(6);
  const lng = Number(longitude).toFixed(6);
  const form = $("#request-form");
  form.elements.operation_latitude.value = lat;
  form.elements.operation_longitude.value = lng;
  if (!operationMarker) operationMarker = L.marker([Number(lat),Number(lng)]).addTo(operationMap);
  else operationMarker.setLatLng([Number(lat),Number(lng)]);
  if (focus) operationMap.setView([Number(lat),Number(lng)], Math.max(operationMap.getZoom(),15));
  $("#map-coordinate").textContent = `พิกัด ${lat}, ${lng}`;
  const link = $("#map-open-link");
  link.href = googleMapsUrl(lat,lng);
  link.hidden = false;
  $("#clear-operation-pin").hidden = false;
}

function clearOperationPin() {
  const form = $("#request-form");
  form.elements.operation_latitude.value = "";
  form.elements.operation_longitude.value = "";
  if (operationMarker) operationMap.removeLayer(operationMarker);
  operationMarker = null;
  $("#map-coordinate").textContent = "ยังไม่ได้ปักหมุด";
  $("#map-open-link").hidden = true;
  $("#clear-operation-pin").hidden = true;
}

function useCurrentLocation() {
  if (!navigator.geolocation) { showToast("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง",true); return; }
  const button = $("#use-current-location");
  button.disabled = true;
  button.textContent = "กำลังหาตำแหน่ง…";
  navigator.geolocation.getCurrentPosition(
    position => { setOperationPin(position.coords.latitude,position.coords.longitude,true); button.disabled=false; button.textContent="ใช้ตำแหน่งปัจจุบัน"; },
    () => { showToast("ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาตตำแหน่งหรือคลิกบนแผนที่",true); button.disabled=false; button.textContent="ใช้ตำแหน่งปัจจุบัน"; },
    {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
  );
}

async function loadRegistry() {
  try {
    if (online) {
      const [statsResult,centersResult] = await Promise.all([
        supabase.rpc("get_public_volunteer_stats"),
        supabase.rpc("get_public_subcenters")
      ]);
      if (statsResult.error) throw statsResult.error;
      if (centersResult.error) throw centersResult.error;
      volunteerStats = statsResult.data || [];
      publicCenters = centersResult.data || [];
    } else {
      volunteerStats = GROUPS.map((_,index) => ({group_no:index+1,total:demoVolunteers.filter(item => item.group_no===index+1).length,available:demoVolunteers.filter(item => item.group_no===index+1 && item.active).length}));
      publicCenters = [...DEMO_CENTERS];
    }
    renderRegistryStats();
    renderRegistrationCenters();
  } catch (error) {
    showToast("โหลดสรุปทะเบียนไม่สำเร็จ: " + (error.message || error), true);
  }
}

function renderRegistrationCenters() {
  const select = $("#registration-center");
  const current = select.value;
  select.innerHTML = `<option value="">เลือกศูนย์ย่อย</option>` + publicCenters.map(center => `<option value="${center.id}" ${current===center.id?"selected":""}>${escapeHtml(center.name)}</option>`).join("");
}

function renderRegistryStats() {
  const root = $("#registry-stats");
  root.innerHTML = GROUPS.map((group,index) => {
    const row = volunteerStats.find(item => Number(item.group_no) === index+1) || {total:0,available:0};
    return `<article class="registry-stat"><span>กลุ่ม ${index+1}</span><strong>${Number(row.total||0).toLocaleString("th-TH")}</strong><p>${escapeHtml(group)}</p><small>พร้อมจัดกำลัง ${Number(row.available||0).toLocaleString("th-TH")} คน</small></article>`;
  }).join("");
}

function volunteerPayload(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data);
  const startDate = String(data.get("availability_start_date") || "");
  const endDate = String(data.get("availability_end_date") || "");
  const timeSlots = data.getAll("availability_time_slots").map(String);
  const vehicleTypes = data.getAll("vehicle_types").map(String);
  delete payload.consent;
  delete payload.availability_start_date;
  delete payload.availability_end_date;
  delete payload.availability_time_slots;
  delete payload.vehicle_types;
  const center = publicCenters.find(item => item.id === payload.subcenter_id);
  payload.organization_network = center?.name || "";
  payload.group_no = Number(payload.group_no);
  payload.availability_details = `วันที่ ${formatVolunteerDate(startDate)}–${formatVolunteerDate(endDate)} · เวลา ${timeSlots.join(", ")}`;
  payload.vehicle = vehicleTypes.join(", ");
  return payload;
}

function isValidThaiNationalId(value) {
  const nationalId = String(value || "");
  if (!/^[0-9]{13}$/.test(nationalId)) return false;
  const weightedSum = [...nationalId.slice(0,12)].reduce((sum,digit,index) => sum + Number(digit) * (13-index),0);
  return (11 - (weightedSum % 11)) % 10 === Number(nationalId[12]);
}

function setVolunteerIdentityValidity(form) {
  const nationalId = form.elements.national_id;
  const phone = form.elements.phone;
  const idValue = nationalId.value.trim();
  const phoneValue = phone.value.trim();
  const editingUnchangedId = form.id === "volunteer-edit-form" && idValue === form.dataset.originalNationalId;
  const editingUnchangedPhone = form.id === "volunteer-edit-form" && phoneValue === form.dataset.originalPhone;
  nationalId.setCustomValidity(!editingUnchangedId && idValue && idValue.length === 13 && !isValidThaiNationalId(idValue)
    ? "เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบ Check Digit"
    : "");
  phone.setCustomValidity(!editingUnchangedPhone && phoneValue && !/^[0-9]{9,10}$/.test(phoneValue)
    ? "กรอกเบอร์โทรศัพท์เป็นตัวเลข 9–10 หลัก เช่น 0812345678"
    : "");
  if (!editingUnchangedId && idValue && idValue.length === 13 && !isValidThaiNationalId(idValue)) {
    nationalId.reportValidity();
    return false;
  }
  if (!editingUnchangedPhone && phoneValue && !/^[0-9]{9,10}$/.test(phoneValue)) {
    phone.reportValidity();
    return false;
  }
  return true;
}

function attachNationalIdValidation(form) {
  const nationalId = form.elements.national_id;
  const phone = form.elements.phone;
  nationalId.addEventListener("input",() => {
    const digits = nationalId.value.replace(/[^0-9]/g,"").slice(0,13);
    if (nationalId.value !== digits) nationalId.value = digits;
    setVolunteerIdentityValidity(form);
  });
  phone.addEventListener("input",() => {
    const digits = phone.value.replace(/[^0-9]/g,"").slice(0,10);
    if (phone.value !== digits) phone.value = digits;
    setVolunteerIdentityValidity(form);
  });
}

function formatVolunteerDate(value) {
  const [year,month,day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "–";
  return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${year + 543}`;
}

function validateVolunteerOptions(form) {
  const startDate = form.elements.availability_start_date;
  const endDate = form.elements.availability_end_date;
  const selectedTimes = $$('input[name="availability_time_slots"]:checked', form);
  const selectedVehicles = $$('input[name="vehicle_types"]:checked', form);
  const timeError = $("#availability-time-error");
  const vehicleError = $("#vehicle-type-error");

  endDate.setCustomValidity(startDate.value && endDate.value && endDate.value < startDate.value ? "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น" : "");
  timeError.hidden = selectedTimes.length > 0;
  vehicleError.hidden = selectedVehicles.length > 0;

  if (!endDate.checkValidity()) {
    endDate.reportValidity();
    return false;
  }
  if (!selectedTimes.length) {
    $("#availability-time-group").scrollIntoView({behavior:"smooth",block:"center"});
    $('input[name="availability_time_slots"]', form)?.focus();
    showToast("กรุณาเลือกเวลาที่พร้อมปฏิบัติงานอย่างน้อย 1 ช่วง", true);
    return false;
  }
  if (!selectedVehicles.length) {
    $("#vehicle-type-group").scrollIntoView({behavior:"smooth",block:"center"});
    $('input[name="vehicle_types"]', form)?.focus();
    showToast("กรุณาเลือกยานพาหนะอย่างน้อย 1 ประเภท", true);
    return false;
  }
  return true;
}

async function registerVolunteer(payload) {
  if (online) {
    const {data,error} = await supabase.rpc("register_public_volunteer", {p_payload:payload});
    if (error) throw error;
    return normalizeRpcResult(data);
  }
  const record = {id:crypto.randomUUID(),registration_no:`VOL-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(demoVolunteerCounter++).padStart(5,"0")}`,...payload,active:true};
  demoVolunteers.unshift(record);
  return {volunteer_id:record.id,registration_no:record.registration_no,edit_token:crypto.randomUUID().replaceAll("-","")};
}

async function handleVolunteerSubmit(event) {
  event.preventDefault();
  if (!setVolunteerIdentityValidity(event.currentTarget)) return;
  if (!validateVolunteerOptions(event.currentTarget)) return;
  const button = $("#volunteer-submit");
  button.disabled = true;
  button.textContent = "กำลังบันทึก…";
  try {
    const result = await registerVolunteer(volunteerPayload(event.currentTarget));
    $("#success-registration-no").textContent = result.registration_no;
    $("#volunteer-success-dialog").showModal();
    event.currentTarget.reset();
    $("#availability-time-error").hidden = true;
    $("#vehicle-type-error").hidden = true;
    $("#group-selector input").checked = true;
    await loadRegistry();
  } catch (error) {
    showToast("ลงทะเบียนไม่สำเร็จ: " + (error.message || error), true);
  } finally {
    button.disabled = false;
    button.textContent = "ลงทะเบียนเข้าร่วมโครงการ";
  }
}

async function loadDashboard() {
  const token = authSession?.session_token || null;
  const role = authSession?.role || "public";
  const loading = $("#dashboard-loading");
  $("#dashboard-content").hidden = true;
  loading.hidden = false;
  loading.textContent = "กำลังโหลด Dashboard…";
  setConnectionState(online ? "connecting" : "demo");
  try {
    let rows;
    if (role === "central") {
      const [workspaceResult, publicResult] = online
        ? await Promise.all([
          supabase.rpc("get_central_workspace_by_session", {p_session_token:token}),
          supabase.from("public_requests").select("*").order("received_at", {ascending:false}).limit(500)
        ])
        : [{data:demoCentralWorkspace()}, {data:[...demoRows,...[...demoManage.values()].map(item => item.public)]}];
      if (workspaceResult.error || publicResult.error) throw workspaceResult.error || publicResult.error;
      if (!workspaceResult.data) throw new Error("บัญชีไม่มีสิทธิ์หรือเซสชันหมดอายุ");
      centralState = workspaceResult.data;
      const publicById = new Map((publicResult.data||[]).map(item => [item.id,item]));
      rows = (centralState.requests||[]).map(item => ({
        ...item,
        overall_status:publicById.get(item.id)?.overall_status || item.overall_status || "pending",
        completed_steps:publicById.get(item.id)?.completed_steps ?? item.completed_steps ?? 0,
        current_step:publicById.get(item.id)?.current_step || item.current_step || "รับคำร้อง"
      }));
    } else if (role === "subcenter") {
      const workspace = await fetchSubcenterWorkspace();
      rows = (workspace.requests||[]).map(item => item.request).filter(Boolean);
    } else if (online) {
      const {data,error} = await supabase.from("public_requests").select("*").order("received_at", {ascending:false}).limit(500);
      if (error) throw error;
      rows = data || [];
    } else {
      rows = [...demoRows,...[...demoManage.values()].map(item => item.public)];
    }
    if (routeInfo().name !== "dashboard" || (authSession?.session_token || null) !== token) return;
    dashboardRole = role;
    requestRows = rows.sort((a,b) => new Date(b.received_at)-new Date(a.received_at));
    dashboardPage = 0;
    renderDashboard();
    loading.hidden = true;
    $("#dashboard-content").hidden = false;
    requestAnimationFrame(renderDashboardMap);
    if (online) setConnectionState("connected");
  } catch (error) {
    if (routeInfo().name !== "dashboard" || (authSession?.session_token || null) !== token) return;
    loading.textContent = "โหลด Dashboard ไม่สำเร็จ: " + (error.message || error);
    showToast(loading.textContent, true);
  }
}

function dashboardProgress(row) {
  if (row.overall_status === "completed") return 100;
  return Math.max(0,Math.min(100,Math.round(Number(row.completed_steps||0)/8*100)));
}

function renderDashboard() {
  const isCentral = dashboardRole === "central";
  const isSubcenter = dashboardRole === "subcenter";
  const staff = isCentral || isSubcenter;
  $("#dashboard-scope").textContent = isCentral ? "ภาพรวมศูนย์อำนวยการ" : isSubcenter ? "ภาพรวมศูนย์ย่อย" : "ภาพรวมสาธารณะ";
  $("#dashboard-description").textContent = isCentral
    ? "ติดตามคำร้องทุกศูนย์ย่อยและส่งต่อภารกิจตามพื้นที่รับผิดชอบ"
    : isSubcenter
      ? `เฉพาะคำร้องที่มอบหมายให้${subcenterSession?.data?.center?.name || "ศูนย์ของท่าน"}`
      : "ติดตามสถานะคำร้องและผลการช่วยเหลือ โดยไม่แสดงข้อมูลส่วนบุคคลหรือพิกัด";
  const action = $("#dashboard-primary-action");
  action.href = isCentral ? "#dispatch" : isSubcenter ? "#subcenter" : "#new";
  action.textContent = isCentral ? "จัดการคำร้อง →" : isSubcenter ? "ดูภารกิจของศูนย์ →" : "+ สร้างคำร้องใหม่";
  for (const [selector,href] of [["#dashboard-map-action",isSubcenter?"#subcenter":"#dispatch"],["#dashboard-work-action",isSubcenter?"#subcenter":"#dispatch"]]) {
    const link = $(selector);
    link.hidden = !staff;
    link.href = href;
  }
  $("#kpi-total").textContent = requestRows.length.toLocaleString("th-TH");
  $("#kpi-active").textContent = requestRows.filter(row => ["pending","in_progress"].includes(row.overall_status)).length.toLocaleString("th-TH");
  $("#kpi-blocked").textContent = requestRows.filter(row => row.overall_status === "blocked").length.toLocaleString("th-TH");
  $("#kpi-done").textContent = requestRows.filter(row => row.overall_status === "completed").length.toLocaleString("th-TH");
  $("#kpi-people").textContent = requestRows.reduce((sum,row) => sum + Number(row.personnel_required||0),0).toLocaleString("th-TH");
  const progress = requestRows.length ? Math.round(requestRows.reduce((sum,row) => sum + dashboardProgress(row),0)/requestRows.length) : 0;
  $("#gauge-value").textContent = `${progress}%`;
  $("#dashboard-gauge").style.setProperty("--gauge-progress",`${progress}%`);
  $("#dashboard-gauge").setAttribute("aria-label",`ความคืบหน้าเฉลี่ย ${progress}%`);
  $("#status-total").textContent = requestRows.length.toLocaleString("th-TH");
  $("#donut-total").textContent = requestRows.length.toLocaleString("th-TH");
  renderStatusChart();
  renderUrgentList();
  renderRequestTable();
}

function renderStatusChart() {
  const colors = {pending:"#d7bea3",in_progress:"#c4783d",blocked:"#c74d4a",completed:"#3d9b70"};
  const counts = Object.fromEntries(Object.keys(STATUS).map(key => [key,requestRows.filter(row => row.overall_status === key).length]));
  $("#status-chart").innerHTML = Object.keys(STATUS).map(key => {
    const count = counts[key];
    const percent = requestRows.length ? Math.round((count/requestRows.length)*100) : 0;
    return `<div class="bar-row"><span>${STATUS[key][0]}</span><div class="bar-track"><div class="bar-fill ${key}" style="width:${percent}%"></div></div><strong>${count}</strong></div>`;
  }).join("");
  let position = 0;
  const segments = Object.keys(STATUS).map(key => {
    const start = position;
    position += requestRows.length ? counts[key]/requestRows.length*100 : 0;
    return `${colors[key]} ${start}% ${position}%`;
  });
  $("#dashboard-donut").style.background = requestRows.length ? `conic-gradient(${segments.join(",")})` : "#ebe5e1";
  $("#dashboard-donut").setAttribute("aria-label",Object.keys(STATUS).map(key=>`${STATUS[key][0]} ${counts[key]} รายการ`).join(" · "));
  $("#dashboard-legend").innerHTML = Object.keys(STATUS).map(key => `<div><i style="background:${colors[key]}"></i><span>${STATUS[key][0]}</span><strong>${counts[key]} (${requestRows.length?Math.round(counts[key]/requestRows.length*100):0}%)</strong></div>`).join("");
}

function renderUrgentList() {
  const ordered = requestRows.filter(row => row.overall_status !== "completed").sort((a,b) => {
    const rank = {critical:0,urgent:1,normal:2};
    return (rank[a.priority]??2)-(rank[b.priority]??2) || new Date(a.operation_start_at)-new Date(b.operation_start_at);
  }).slice(0,4);
  $("#urgent-list").innerHTML = ordered.length ? ordered.map(row => `<article class="urgent-item"><i class="urgency-mark ${escapeHtml(row.priority)}"></i><div><strong>${escapeHtml(row.location_name)}</strong><span>${escapeHtml(row.mission)}</span></div><time>${formatDate(row.operation_start_at)}</time></article>`).join("") : `<div class="empty-state"><strong>ไม่มีงานค้าง</strong><span>ทุกภารกิจเสร็จสิ้นแล้ว</span></div>`;
}

function renderRequestTable() {
  const query = $("#search-input").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  const dateFilter = $("#date-filter").value;
  const cutoff = dateFilter === "all" ? 0 : Date.now() - Number(dateFilter)*86400000;
  const filtered = requestRows.filter(row => (status === "all" || row.overall_status === status) && (!cutoff || new Date(row.received_at).getTime() >= cutoff) && (!query || [row.request_no,row.location_name,row.organization,row.mission,row.assigned_team_name,row.assigned_center_name].some(value => String(value||"").toLowerCase().includes(query))));
  const pages = Math.max(1,Math.ceil(filtered.length/DASHBOARD_PAGE_SIZE));
  dashboardPage = Math.min(dashboardPage,pages-1);
  const start = dashboardPage*DASHBOARD_PAGE_SIZE;
  const pageRows = filtered.slice(start,start+DASHBOARD_PAGE_SIZE);
  $("#result-summary").textContent = `แสดงข้อมูลตามสิทธิ์ ${requestRows.length.toLocaleString("th-TH")} รายการ`;
  $("#empty-state").hidden = Boolean(filtered.length);
  $("#dashboard-page-summary").textContent = filtered.length ? `แสดง ${start+1}–${start+pageRows.length} จาก ${filtered.length} รายการ` : "ไม่พบรายการ";
  $("#dashboard-page-number").textContent = `${dashboardPage+1} / ${pages}`;
  $("#dashboard-prev-page").disabled = dashboardPage === 0;
  $("#dashboard-next-page").disabled = dashboardPage >= pages-1;
  $("#request-table-body").innerHTML = pageRows.map(row => {
    const percent = dashboardProgress(row);
    const statusInfo = STATUS[row.overall_status] || STATUS.pending;
    const requestNumber = dashboardRole === "public" ? `<strong>${escapeHtml(row.request_no)}</strong>` : `<button type="button" class="dashboard-request-link" data-request-id="${escapeHtml(row.id)}">${escapeHtml(row.request_no)}</button>`;
    const teamName = dashboardRole === "public" ? "ข้อมูลชุดปฏิบัติการสำหรับเจ้าหน้าที่" : row.assigned_team_name || row.assigned_team_no || "ยังไม่มอบหมายชุด";
    return `<tr><td>${requestNumber}<span class="cell-sub">ปฏิบัติงาน ${formatDate(row.operation_start_at)}</span></td><td><strong>${escapeHtml(row.location_name)}</strong><span class="cell-sub">${escapeHtml(row.mission)}</span></td><td><strong>${escapeHtml(row.organization||"–")}</strong><span class="cell-sub">${escapeHtml(teamName)}</span></td><td>${formatDate(row.received_at)}</td><td><strong>${Number(row.personnel_required||0).toLocaleString("th-TH")} คน</strong><span class="cell-sub">${escapeHtml(PRIORITY[row.priority]||"ปกติ")}</span></td><td class="progress-cell"><span class="progress-label">${percent}% · ${escapeHtml(row.current_step||"รับคำร้อง")}</span><div class="mini-progress"><i style="width:${percent}%"></i></div></td><td><span class="status-chip ${statusInfo[1]}">${statusInfo[0]}</span></td></tr>`;
  }).join("");
}

function renderDashboardMap() {
  const empty = $("#dashboard-map-empty");
  const caption = $("#dashboard-map-caption");
  const mapRows = dashboardRole === "public" ? [] : requestRows.map(row => ({row,location:requestLocation(row)})).filter(item => item.location.hasCoordinates);
  caption.textContent = dashboardRole === "public" ? "พิกัดจุดปฏิบัติงานแสดงเฉพาะเจ้าหน้าที่" : `พบพิกัด ${mapRows.length.toLocaleString("th-TH")} คำร้อง · กดหมุดเพื่อดูรายละเอียดและเปิด Google Maps`;
  empty.hidden = mapRows.length > 0;
  empty.textContent = dashboardRole === "public" ? "เข้าสู่ระบบเจ้าหน้าที่เพื่อดูพิกัดคำร้องตามสิทธิ์" : "ยังไม่มีคำร้องที่ปักหมุดพิกัดในขอบเขตนี้";
  if (!window.L) { empty.hidden = false; empty.textContent = "ไม่สามารถโหลดแผนที่ได้ในขณะนี้"; return; }
  if (!dashboardMap) {
    dashboardMap = L.map("dashboard-map",{scrollWheelZoom:false}).setView([13.7563,100.5018],5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(dashboardMap);
    dashboardMapMarkers = L.layerGroup().addTo(dashboardMap);
  }
  dashboardMapMarkers.clearLayers();
  const groups = new Map();
  mapRows.forEach(item => {
    const key = `${item.location.latitude.toFixed(2)},${item.location.longitude.toFixed(2)}`;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(item);
  });
  const bounds = [];
  groups.forEach(items => {
    const {latitude,longitude} = items[0].location;
    const coordinate = [latitude,longitude];
    bounds.push(coordinate);
    const count = items.length;
    const marker = L.circleMarker(coordinate,{radius:Math.min(20,10+Math.sqrt(count)*3),color:"#fff",weight:3,fillColor:"#8e4128",fillOpacity:.95});
    marker.bindTooltip(`${count} คำร้อง · ${items.map(item=>escapeHtml(item.row.location_name)).slice(0,3).join(" / ")}`,{direction:"top"});
    const popup = document.createElement("div");
    popup.className = "dashboard-map-popup";
    const heading = document.createElement("strong");
    heading.textContent = count === 1 ? "รายละเอียดคำร้อง ณ จุดนี้" : `คำร้องบริเวณนี้ ${count} รายการ`;
    popup.append(heading);
    const list = document.createElement("div");
    list.className = "dashboard-map-popup-list";
    items.forEach(({row,location}) => {
      const item = document.createElement("div");
      item.className = "dashboard-map-popup-item";
      const title = document.createElement("span");
      title.textContent = `${row.request_no} · ${row.location_name}`;
      const actions = document.createElement("div");
      actions.className = "dashboard-map-popup-actions";
      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "dashboard-map-detail-button";
      detail.textContent = "ดูรายละเอียด";
      detail.addEventListener("click",() => {
        if (!authSession || dashboardRole !== authSession.role || !requestRows.some(request => request.id === row.id)) return;
        marker.closePopup();
        openRequestDetails(row);
      });
      const google = document.createElement("a");
      google.className = "dashboard-map-google-link";
      google.href = location.mapUrl;
      google.target = "_blank";
      google.rel = "noopener noreferrer";
      google.textContent = "เปิด Google Maps ↗";
      actions.append(detail,google);
      item.append(title,actions);
      list.append(item);
    });
    popup.append(list);
    marker.bindPopup(popup,{maxWidth:330,minWidth:230});
    marker.addTo(dashboardMapMarkers);
  });
  if (bounds.length) dashboardMap.fitBounds(bounds,{padding:[28,28],maxZoom:10});
  else dashboardMap.setView([13.7563,100.5018],5);
  dashboardMap.invalidateSize();
}

function requestPayload(form) {
  const payload = Object.fromEntries(new FormData(form));
  payload.received_at = payload.received_at ? new Date(payload.received_at).toISOString() : new Date().toISOString();
  payload.received_by = "ระบบรับคำร้องออนไลน์";
  const latitude = payload.operation_latitude;
  const longitude = payload.operation_longitude;
  if (latitude && longitude) {
    const mapUrl = googleMapsUrl(latitude,longitude);
    payload.operation_point = [payload.operation_point,`พิกัด: ${latitude}, ${longitude}`,`แผนที่: ${mapUrl}`].filter(Boolean).join(" | ");
  }
  delete payload.operation_latitude;
  delete payload.operation_longitude;
  payload.personnel_required = Number(payload.personnel_required);
  ["operation_start_at","operation_end_at"].forEach(key => { payload[key] = payload[key] ? new Date(payload[key]).toISOString() : null; });
  return payload;
}

async function createRequest(payload) {
  if (online) {
    const {data,error} = await supabase.rpc("create_public_request", {p_payload:payload});
    if (error) throw error;
    return normalizeRpcResult(data);
  }
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replaceAll("-","");
  const number = `REQ-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(demoRequestCounter++).padStart(5,"0")}`;
  const steps = STEP_CATALOG.map(([code,name,detail],index) => ({step_code:code,step_order:index+1,step_name:name,step_detail:detail,status:index===0?"completed":"pending",assignee:"",note:"",action_at:index===0?new Date().toISOString():null}));
  const publicRow = {...payload,id,request_no:number,overall_status:"in_progress",current_step:"ตรวจสอบ",completed_steps:1,assigned_team_name:null};
  demoManage.set(id,{token,request:{...payload,id,request_no:number,summary:"",recorder_name:"",recorder_position:""},steps,public:publicRow});
  return {request_id:id,request_no:number,edit_token:token};
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  const button = $("#submit-button");
  button.disabled = true;
  button.textContent = "กำลังส่งคำร้อง…";
  try {
    const result = await createRequest(requestPayload(event.currentTarget));
    $("#success-request-no").textContent = result.request_no;
    $("#request-success-dialog").showModal();
    event.currentTarget.reset();
    clearOperationPin();
    setRequestDefaults();
  } catch (error) {
    showToast("ส่งคำร้องไม่สำเร็จ: " + (error.message || error), true);
  } finally {
    button.disabled = false;
    button.textContent = `ส่งคำร้องเข้าสู่${CENTRAL_NAME}`;
  }
}

function demoCentralWorkspace() {
  const existingCenters = centralState?.centers || [...DEMO_CENTERS];
  const existingTeams = centralState?.teams?.length ? centralState.teams : [{
    id:"t1",team_no:"TEAM-20260928-0001",team_type:"relief_packing",center_id:"c1",center_name:DEMO_CENTERS[0].name,leader_name:demoVolunteers[0].full_name,
    operation_area:"กรุงเทพมหานครและปริมณฑล",operation_start_at:new Date(now+86400000).toISOString(),
    operation_end_at:new Date(now+118800000).toISOString(),member_count:3,
    members:demoVolunteers.slice(0,3).map((volunteer,index)=>({volunteer_id:volunteer.id,full_name:volunteer.full_name,role:index===0?"หัวหน้าชุด":"สมาชิก",is_leader:index===0}))
  }];
  return {label:`${CENTRAL_NAME} (โหมดตัวอย่าง)`,volunteers:demoVolunteers,teams:existingTeams,centers:existingCenters,requests:[...demoRows,...[...demoManage.values()].map(item=>item.request)].map(request => ({
    ...request,
    assigned_center_id:request.id==="d1"?"c1":(request.assigned_center_id||null),
    assigned_center_name:request.id==="d1"?existingCenters[0].name:(request.assigned_center_name||null),
    assigned_team_id:request.id==="d1"?existingTeams[0].id:(request.assigned_team_id||null),
    assigned_team_no:request.id==="d1"?existingTeams[0].team_no:(request.assigned_team_no||null),
    assigned_team_type:request.id==="d1"?existingTeams[0].team_type:(request.assigned_team_type||null),
    assigned_team_leader:request.id==="d1"?existingTeams[0].leader_name:(request.assigned_team_leader||null)
  }))};
}

async function loadCentral(viewName = "center") {
  const targetName = viewName === "dispatch" ? "dispatch" : "center";
  const content = $(`#${targetName}-content`);
  const loading = $(`#${targetName}-loading`);
  content.hidden = true;
  loading.hidden = false;
  loading.textContent = targetName === "dispatch" ? "กำลังโหลดข้อมูลคำร้อง ศูนย์ย่อย และชุดปฏิบัติการ…" : `กำลังโหลดข้อมูล${CENTRAL_NAME}…`;
  if (!authSession || authSession.role !== "central") { location.hash="login"; return; }
  try {
    if (online) {
      const {data,error} = await supabase.rpc("get_central_workspace_by_session", {p_session_token:authSession.session_token});
      if (error) throw error;
      centralState = data;
    } else {
      centralState = demoCentralWorkspace();
    }
    if (!centralState) throw new Error("บัญชีไม่มีสิทธิ์หรือเซสชันหมดอายุ");
    $("#center-subtitle").textContent = CENTRAL_NAME;
    $("#dispatch-subtitle").textContent = `${CENTRAL_NAME} · เลือกศูนย์ย่อยผู้รับผิดชอบในแต่ละคำร้อง`;
    renderCentral();
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.textContent = "เปิดระบบเจ้าหน้าที่ไม่ได้: " + (error.message || error);
    if (/เซสชัน|สิทธิ์/.test(error.message||"")) {
      localStorage.removeItem(SESSION_KEY);
      authSession = null;
      applyAuthUi();
    }
  }
}

function renderCentral() {
  const volunteers = centralState.volunteers || [];
  const requests = centralState.requests || [];
  const centers = centralState.centers || [];
  const teams = centralState.teams || [];
  const unassigned = requests.filter(request => !request.assigned_center_id).length;
  $("#center-kpis").innerHTML = [
    ["กำลังในทะเบียน",volunteers.length,"คน"],
    ["ชุดปฏิบัติการ",teams.length,"ชุด"]
  ].map(([label,value,unit],index) => `<article class="kpi-card ${index===0?"kpi-accent":""}"><span>${label}</span><strong>${Number(value).toLocaleString("th-TH")}</strong><small>${unit}</small></article>`).join("");
  $("#dispatch-kpis").innerHTML = [
    ["ศูนย์ย่อย",centers.filter(center => center.active).length,"ศูนย์"],
    ["ชุดปฏิบัติการ",teams.length,"ชุด"],
    ["คำร้องทั้งหมด",requests.length,"รายการ"],
    ["คำร้องรอส่งต่อศูนย์ย่อย",unassigned,"รายการ"]
  ].map(([label,value,unit],index) => `<article class="kpi-card ${index===0?"kpi-accent":""}"><span>${label}</span><strong>${Number(value).toLocaleString("th-TH")}</strong><small>${unit}</small></article>`).join("");
  renderCentralVolunteers();
  renderTeams(teams,"#central-team-list",true);
  renderDispatchCenters();
  renderDispatchTeams();
  renderAssignments();
}

function filteredCentralVolunteers() {
  const query = $("#volunteer-search").value.trim().toLowerCase();
  const group = $("#volunteer-group-filter").value;
  return (centralState?.volunteers||[])
    .filter(item => (group === "all" || Number(item.group_no) === Number(group)) && (!query || [item.registration_no,item.full_name,item.organization_network,item.operational_areas,item.skills].some(value => String(value||"").toLowerCase().includes(query))))
    .sort((a,b) => String(b.created_at||"").localeCompare(String(a.created_at||"")) || String(b.registration_no||"").localeCompare(String(a.registration_no||"")));
}

function renderCentralVolunteers() {
  const filtered = filteredCentralVolunteers();
  volunteerPage = Math.min(volunteerPage,Math.max(0,Math.ceil(filtered.length/VOLUNTEERS_PER_PAGE)-1));
  const start = volunteerPage*VOLUNTEERS_PER_PAGE;
  const rows = filtered.slice(start,start+VOLUNTEERS_PER_PAGE);
  $("#volunteer-table-body").innerHTML = rows.length ? rows.map(item => `<tr data-volunteer-id="${item.id}"><td><strong>${escapeHtml(item.registration_no)}</strong><span class="cell-sub">${escapeHtml(item.scoutdd_id||"ไม่มี ScoutDD ID")}</span></td><td><strong>${escapeHtml(item.full_name)}</strong><span class="cell-sub">${escapeHtml(item.phone)}</span></td><td><strong>${escapeHtml(item.center_name||item.organization_network||"ยังไม่ระบุศูนย์")}</strong><span class="group-chip">กลุ่ม ${Number(item.group_no)}</span></td><td><strong>${escapeHtml(item.operational_areas)}</strong><span class="cell-sub clamp-text">${escapeHtml(item.skills)}</span></td><td><span class="status-chip ${item.active?"completed":"blocked"}">${item.active?"พร้อมจัดกำลัง":"ไม่พร้อม"}</span><span class="cell-sub clamp-text">${escapeHtml(item.availability_details)}</span></td><td><div class="row-actions"><button class="button button-ghost compact-action edit-volunteer" type="button">แก้ไข</button><button class="button button-danger compact-action delete-volunteer" type="button">ลบ</button></div></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty-state compact-empty">ไม่พบข้อมูลตามเงื่อนไข</div></td></tr>`;
  $("#volunteer-page-info").textContent = filtered.length ? `แสดง ${start+1}–${start+rows.length} จาก ${filtered.length} คน` : "ไม่พบผู้ลงทะเบียน";
  $("#volunteer-prev-page").disabled = volunteerPage === 0;
  $("#volunteer-next-page").disabled = start+VOLUNTEERS_PER_PAGE >= filtered.length;
}

function openVolunteerEditor(volunteerId) {
  const volunteer = (centralState?.volunteers||[]).find(item => item.id === volunteerId);
  if (!volunteer) return;
  const form = $("#volunteer-edit-form");
  const centers = (centralState?.centers||[]).filter(center => center.active || center.id === volunteer.subcenter_id);
  $("#edit-volunteer-center").innerHTML = `<option value="">เลือกศูนย์ย่อย</option>` + centers.map(center => `<option value="${center.id}">${escapeHtml(center.name)}</option>`).join("");
  form.elements.volunteer_id.value = volunteer.id;
  ["group_no","subcenter_id","scoutdd_id","national_id","full_name","phone","operational_areas","skills","vehicle","equipment","availability_details"].forEach(key => {
    if (form.elements[key]) form.elements[key].value = key === "phone"
      ? String(volunteer[key] ?? "").replace(/[^0-9]/g,"").slice(0,10)
      : volunteer[key] ?? "";
  });
  form.dataset.originalNationalId = String(volunteer.national_id||"");
  form.dataset.originalPhone = form.elements.phone.value;
  form.elements.national_id.setCustomValidity("");
  form.elements.phone.setCustomValidity("");
  $("#volunteer-edit-error").hidden = true;
  form.elements.active.checked = Boolean(volunteer.active);
  $("#volunteer-edit-dialog").showModal();
}

async function saveVolunteerEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!setVolunteerIdentityValidity(form)) return;
  const data = Object.fromEntries(new FormData(form));
  const volunteerId = data.volunteer_id;
  const payload = {...data,group_no:Number(data.group_no),active:form.elements.active.checked};
  delete payload.volunteer_id;
  const button = $("button[type=submit]",form);
  const errorBox = $("#volunteer-edit-error");
  errorBox.hidden = true;
  button.disabled = true;
  try {
    if (!volunteerId) throw new Error("ไม่พบรหัสผู้ลงทะเบียน กรุณาปิดหน้าต่างแล้วเปิดรายการใหม่");
    if (online) {
      const {error} = await supabase.rpc("update_volunteer_by_session",{p_session_token:authSession.session_token,p_volunteer_id:volunteerId,p_payload:payload});
      if (error) throw error;
      await loadCentral("center");
    } else {
      const volunteer = centralState.volunteers.find(item => item.id===volunteerId);
      const center = centralState.centers.find(item => item.id===payload.subcenter_id);
      Object.assign(volunteer,payload,{organization_network:center?.name||volunteer.organization_network,center_name:center?.name||""});
      renderCentral();
    }
    $("#volunteer-edit-dialog").close();
    showToast("บันทึกข้อมูลผู้ลงทะเบียนแล้ว");
  } catch (error) {
    errorBox.textContent = "แก้ไขข้อมูลไม่สำเร็จ: " + (error.message||error);
    errorBox.hidden = false;
  } finally { button.disabled = false; }
}

function openVolunteerDeleteDialog(volunteerId) {
  const volunteer = (centralState?.volunteers||[]).find(item => item.id===volunteerId);
  if (!volunteer) return;
  if ((centralState?.teams||[]).some(team => team.members?.some(member => member.volunteer_id === volunteerId))) {
    showToast("ผู้ลงทะเบียนอยู่ในชุดปฏิบัติการแล้ว กรุณาแก้ไขเป็นไม่พร้อมแทนการลบ",true);
    return;
  }
  const dialog = $("#volunteer-delete-dialog");
  dialog.dataset.volunteerId = volunteerId;
  $("#volunteer-delete-name").textContent = volunteer.full_name;
  $("#volunteer-delete-error").hidden = true;
  dialog.showModal();
}

async function deleteVolunteer() {
  const dialog = $("#volunteer-delete-dialog");
  const volunteerId = dialog.dataset.volunteerId;
  const button = $("#confirm-volunteer-delete");
  const errorBox = $("#volunteer-delete-error");
  button.disabled = true;
  try {
    if (!volunteerId) throw new Error("ไม่พบรหัสผู้ลงทะเบียน กรุณาเปิดรายการใหม่");
    if (online) {
      const {error} = await supabase.rpc("delete_volunteer_by_session",{p_session_token:authSession.session_token,p_volunteer_id:volunteerId});
      if (error) throw error;
      await loadCentral("center");
    } else {
      centralState.volunteers = centralState.volunteers.filter(item => item.id!==volunteerId);
      const demoIndex = demoVolunteers.findIndex(item => item.id===volunteerId);
      if (demoIndex>=0) demoVolunteers.splice(demoIndex,1);
      renderCentral();
    }
    dialog.close();
    showToast("ลบข้อมูลผู้ลงทะเบียนแล้ว");
  } catch (error) {
    errorBox.textContent = "ลบข้อมูลไม่สำเร็จ: " + (error.message||error);
    errorBox.hidden = false;
  } finally { button.disabled = false; }
}

function renderMemberPicker() {
  const volunteers = (subcenterSession?.data?.volunteers||[]).filter(item => item.active);
  const selected = new Set($$("#team-member-picker input[type=checkbox]:checked").map(input => input.value));
  const currentLeader = $("#team-leader").value;
  $("#team-leader").innerHTML = `<option value="">เลือกหัวหน้าชุด</option>` + volunteers.map(item => `<option value="${item.id}" ${currentLeader===item.id?"selected":""}>${escapeHtml(item.full_name)} · กลุ่ม ${item.group_no}</option>`).join("");
  $("#team-member-picker").innerHTML = volunteers.length ? volunteers.map(item => `<label class="member-option"><span class="member-check"><input type="checkbox" value="${item.id}" ${selected.has(item.id)?"checked":""}><span><strong>${escapeHtml(item.full_name)}</strong><small>กลุ่ม ${item.group_no} · ${escapeHtml(item.skills)}</small></span></span><input class="member-role" data-id="${item.id}" placeholder="หน้าที่ / ทักษะที่รับผิดชอบ"></label>`).join("") : `<div class="empty-state"><strong>ยังไม่มีกำลังพร้อมจัดชุด</strong><span>เปิดรับลงทะเบียนจากหน้าสาธารณะก่อน</span></div>`;
  updateTeamMemberCount();
}

function updateTeamMemberCount() {
  $("#team-member-count").value = `${$$("#team-member-picker input[type=checkbox]:checked").length.toLocaleString("th-TH")} คน`;
}

async function handleTeamSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const members = $$("#team-member-picker input[type=checkbox]:checked").map(input => ({volunteer_id:input.value,role:$( `.member-role[data-id="${input.value}"]`, $("#team-member-picker")).value,notes:""}));
  if (!members.some(member => member.volunteer_id === data.leader_volunteer_id)) members.unshift({volunteer_id:data.leader_volunteer_id,role:"หัวหน้าชุด",notes:""});
  const payload = {...data,operation_start_at:new Date(data.operation_start_at).toISOString(),operation_end_at:data.operation_end_at?new Date(data.operation_end_at).toISOString():null,members};
  const button = $("button[type=submit]",form);
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("create_operation_team_by_session", {p_session_token:authSession.session_token,p_payload:payload});
      if (error) throw error;
    } else {
      const workspace = subcenterSession.data;
      const leader = (workspace.volunteers||[]).find(item => item.id===payload.leader_volunteer_id);
      workspace.teams.unshift({id:crypto.randomUUID(),team_no:`TEAM-${String(workspace.teams.length+1).padStart(4,"0")}`,team_type:payload.team_type,center_id:workspace.center.id,center_name:workspace.center.name,leader_name:leader?.full_name||"",operation_area:payload.operation_area,operation_start_at:payload.operation_start_at,operation_end_at:payload.operation_end_at,member_count:members.length,members:members.map(member=>({...member,full_name:(workspace.volunteers||[]).find(item=>item.id===member.volunteer_id)?.full_name||""}))});
    }
    showToast("บันทึกชุดปฏิบัติการแล้ว");
    form.reset();
    form.elements.operation_start_at.value = toLocalInput(new Date(Date.now()+86400000));
    if (online) await loadSubcenter(); else renderSubcenter();
  } catch (error) {
    showToast("สร้างชุดไม่สำเร็จ: " + (error.message || error), true);
  } finally { button.disabled = false; }
}

function renderTeams(teams = [],containerSelector = "#team-list",showCenter = false) {
  $(containerSelector).innerHTML = teams.length ? `<h3 class="subheading">${showCenter?"ชุดปฏิบัติการทั้งหมด":"ชุดปฏิบัติการที่จัดแล้ว"}</h3>` + teams.map(team => {
    const type = TEAM_TYPES[team.team_type] || [team.team_type||"ชุดปฏิบัติการ","",""];
    const members = Array.isArray(team.members) ? team.members : [];
    return `<article class="team-card"><div><span class="team-no">${escapeHtml(team.team_no)}</span><h3>${escapeHtml(type[0])}</h3><p>${escapeHtml(team.operation_area)} · ${formatDate(team.operation_start_at)}</p>${showCenter?`<span class="team-center-label">${escapeHtml(team.center_name||"ยังไม่ระบุศูนย์ย่อย")}</span>`:""}</div><div class="team-meta"><span>หัวหน้าชุด<strong>${escapeHtml(team.leader_name||"–")}</strong></span><span>สมาชิก<strong>${Number(team.member_count??members.length).toLocaleString("th-TH")} คน</strong></span></div>${members.length?`<details><summary>ดูรายชื่อสมาชิก</summary><ul>${members.map(member=>`<li>${escapeHtml(member.full_name||"")} ${member.role?`· ${escapeHtml(member.role)}`:""}</li>`).join("")}</ul></details>`:""}</article>`;
  }).join("") : `<div class="empty-state compact-empty"><strong>ยังไม่ได้จัดชุดปฏิบัติการ</strong><span>เลือกหัวหน้าชุดและสมาชิกจากทะเบียนด้านบน</span></div>`;
}

function teamDisplayName(team) {
  const type = TEAM_TYPES[team?.team_type] || [team?.team_type || "ชุดปฏิบัติการ"];
  return [team?.team_no,type[0]].filter(Boolean).join(" · ");
}

function renderDispatchCenters() {
  const centers = (centralState?.centers || []).filter(center => center.active);
  const requests = centralState?.requests || [];
  $("#dispatch-center-list").innerHTML = centers.length ? centers.map(center => {
    const assigned = requests.filter(request => request.assigned_center_id === center.id);
    const preview = assigned.slice(0,2).map(request => `<li><strong>${escapeHtml(request.request_no)}</strong><span>${escapeHtml(request.location_name)} · ${escapeHtml(request.mission)}</span></li>`).join("");
    return `<article class="dispatch-center-overview"><div class="dispatch-center-overview-heading"><div><span class="team-no">${escapeHtml(center.center_code)}</span><h3>${escapeHtml(center.name)}</h3></div><span class="dispatch-center-count">${assigned.length.toLocaleString("th-TH")} ภารกิจ</span></div>${assigned.length ? `<ul class="dispatch-center-preview">${preview}</ul>${assigned.length>2?`<small>และอีก ${assigned.length-2} ภารกิจ · ดูรายการทั้งหมดด้านล่าง</small>`:""}` : `<p>ยังไม่มีภารกิจที่ได้รับมอบหมาย</p>`}</article>`;
  }).join("") : `<div class="empty-state compact-empty"><strong>ยังไม่มีศูนย์ย่อยที่เปิดใช้งาน</strong><span>ตรวจสอบบัญชีศูนย์ย่อยในฐานข้อมูลก่อนมอบหมายคำร้อง</span></div>`;
}

function renderDispatchTeams() {
  const teams = centralState?.teams || [];
  const visible = dispatchTeamsExpanded ? teams : teams.slice(0,5);
  $("#dispatch-team-list").innerHTML = teams.length ? visible.map(team => `<article class="subcenter-card"><div><span>${escapeHtml(team.team_no)}</span><strong>${escapeHtml((TEAM_TYPES[team.team_type]||[team.team_type||"ชุดปฏิบัติการ"])[0])}</strong><small>${escapeHtml(team.center_name||"ยังไม่ระบุศูนย์ย่อย")} · ${escapeHtml(team.operation_area||"ยังไม่ระบุพื้นที่")}</small></div><div><span class="status-chip completed">พร้อมรับภารกิจ</span><small>หัวหน้าชุด ${escapeHtml(team.leader_name||"–")} · ${Number(team.member_count||0).toLocaleString("th-TH")} คน</small></div></article>`).join("") + `<div class="dispatch-team-footer"><span>แสดง ${visible.length.toLocaleString("th-TH")} จาก ${teams.length.toLocaleString("th-TH")} ชุด</span>${teams.length>5?`<button class="button button-ghost toggle-dispatch-teams" type="button" aria-expanded="${dispatchTeamsExpanded}">${dispatchTeamsExpanded?"แสดงเฉพาะ 5 ชุดล่าสุด":"ดูชุดปฏิบัติการทั้งหมด"}</button>`:""}</div>` : `<div class="empty-state compact-empty"><strong>ยังไม่มีชุดปฏิบัติการ</strong><span>ศูนย์ย่อยต้องจัดชุดปฏิบัติการก่อนจึงจะมอบหมายภารกิจได้</span></div>`;
}

function dispatchRequestCard(request,centers) {
  const selectedCenter = request.assigned_center_id || "";
  const isAssigned = Boolean(selectedCenter);
  const availableCenters = centers.some(center => center.id === selectedCenter) || !selectedCenter ? centers : [...centers,{id:selectedCenter,name:request.assigned_center_name||"ศูนย์ย่อยเดิม (ปิดใช้งาน)"}];
  const assignmentNote = request.center_assignment_note ?? request.assignment_note ?? "";
  return `<article class="assignment-card" data-request-id="${escapeHtml(request.id)}"><div class="assignment-main"><div class="dispatch-request-heading"><span class="team-no">${escapeHtml(request.request_no)}</span><span class="dispatch-assignment-state ${isAssigned?"sent":"waiting"}">${isAssigned?"ส่งต่อแล้ว":"ยังไม่ส่งต่อ"}</span></div><h3>${escapeHtml(request.location_name)}</h3><p>${escapeHtml(request.mission)}</p><small>${Number(request.personnel_required||0).toLocaleString("th-TH")} คน · ${formatDate(request.operation_start_at)} · ผู้ประสานงาน ${escapeHtml(request.coordinator_name||"–")} ${escapeHtml(request.coordinator_phone||"")}</small><button class="request-detail-link view-request-detail" type="button">ดูรายละเอียดทั้งหมดและแผนที่ →</button></div><div class="assignment-control"><label class="assignment-field"><span>ศูนย์ย่อยที่รับผิดชอบ *</span><select class="assignment-center" ${centers.length?"":"disabled"}><option value="">เลือกศูนย์ย่อย</option>${availableCenters.map(center=>`<option value="${escapeHtml(center.id)}" ${selectedCenter===center.id?"selected":""}>${escapeHtml(center.name)}</option>`).join("")}</select></label><input class="assignment-note" placeholder="ข้อสั่งการ / หมายเหตุ" value="${escapeHtml(assignmentNote)}"><button class="button button-primary assign-request" type="button" ${centers.length?"":"disabled"}>${isAssigned?"เปลี่ยนศูนย์ย่อย":"ส่งต่อให้ศูนย์ย่อย"}</button>${isAssigned?`<small><strong>ศูนย์ย่อย:</strong> ${escapeHtml(request.assigned_center_name||availableCenters.find(center=>center.id===selectedCenter)?.name||"–")}<br><strong>สถานะชุดปฏิบัติการ:</strong> ${request.assigned_team_id?`เลือกชุด ${escapeHtml(request.assigned_team_no||"")} แล้ว`:"รอศูนย์ย่อยเลือกชุด"}</small>`:""}</div></article>`;
}

function renderAssignments() {
  const requests = centralState?.requests || [];
  const allCenters = centralState?.centers || [];
  const activeCenters = allCenters.filter(center => center.active);
  const pending = requests.filter(request => !request.assigned_center_id);
  const assigned = requests.filter(request => request.assigned_center_id);
  const byCenter = new Map(allCenters.map(center => [center.id,{id:center.id,name:center.name,center_code:center.center_code,requests:[]}]));
  assigned.forEach(request => {
    if (!byCenter.has(request.assigned_center_id)) byCenter.set(request.assigned_center_id,{id:request.assigned_center_id,name:request.assigned_center_name||"ศูนย์ย่อยที่ไม่อยู่ในทะเบียน",center_code:"–",requests:[]});
    byCenter.get(request.assigned_center_id).requests.push(request);
  });
  const groups = [...byCenter.values()].filter(center => center.requests.length);
  const waitingHtml = pending.length ? pending.map(request => dispatchRequestCard(request,activeCenters)).join("") : `<div class="dispatch-queue-empty">ไม่มีคำร้องรอส่งต่อ</div>`;
  const assignedHtml = groups.length ? groups.map(center => `<details class="dispatch-center-group" data-center-id="${escapeHtml(center.id)}" ${dispatchExpandedCenters.has(center.id)?"open":""}><summary><div><span class="team-no">${escapeHtml(center.center_code||"–")}</span><h4>${escapeHtml(center.name)}</h4><p>${center.requests.slice(0,2).map(request=>escapeHtml(request.location_name)).join(" · ")}${center.requests.length>2?` · และอีก ${center.requests.length-2} เรื่อง`:""}</p></div><span class="dispatch-center-count">${center.requests.length.toLocaleString("th-TH")} ภารกิจ</span></summary><div class="dispatch-center-request-list">${center.requests.map(request=>dispatchRequestCard(request,activeCenters)).join("")}</div></details>`).join("") : `<div class="dispatch-queue-empty">ยังไม่มีคำร้องที่ส่งต่อให้ศูนย์ย่อย</div>`;
  $("#assignment-list").innerHTML = `<section class="dispatch-queue waiting"><div class="dispatch-queue-heading"><div><h3>รอส่งต่อศูนย์ย่อย</h3><p>คำร้องใหม่ที่ส่วนกลางยังไม่ได้เลือกศูนย์ผู้รับผิดชอบ</p></div><span>${pending.length.toLocaleString("th-TH")} รายการ</span></div><div class="dispatch-queue-list">${waitingHtml}</div></section><section class="dispatch-queue sent"><div class="dispatch-queue-heading"><div><h3>ส่งต่อแล้ว · แยกตามศูนย์ย่อย</h3><p>กดชื่อศูนย์เพื่อดูทุกภารกิจและเปลี่ยนศูนย์ผู้รับผิดชอบได้</p></div><span>${assigned.length.toLocaleString("th-TH")} รายการ</span></div><div class="dispatch-center-groups">${assignedHtml}</div></section>`;
}

async function assignRequest(button) {
  const card = button.closest(".assignment-card");
  const centerId = $(".assignment-center",card).value;
  const note = $(".assignment-note",card).value;
  if (!centerId) { showToast("กรุณาเลือกศูนย์ย่อย", true); return; }
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("assign_request_to_center_by_session", {p_session_token:authSession.session_token,p_request_id:card.dataset.requestId,p_center_id:centerId,p_note:note});
      if (error) throw error;
      dispatchExpandedCenters.add(centerId);
      await loadCentral("dispatch");
    } else {
      const request = centralState.requests.find(item => item.id===card.dataset.requestId);
      const center = centralState.centers.find(item => item.id===centerId);
      const centerChanged = Boolean(request.assigned_center_id && request.assigned_center_id!==centerId);
      Object.assign(request,{assigned_center_id:centerId,assigned_center_name:center.name,assignment_note:note});
      if (centerChanged) Object.assign(request,{assigned_team_id:null,assigned_team_no:null,assigned_team_type:null,assigned_team_leader:null,assigned_team_name:null});
      const publicRequest = demoRows.find(item => item.id===request.id) || demoManage.get(request.id)?.public;
      if (publicRequest) Object.assign(publicRequest,{assigned_center_id:centerId,assigned_center_name:center.name,assignment_note:note,...(centerChanged?{assigned_team_id:null,assigned_team_no:null,assigned_team_type:null,assigned_team_leader:null,assigned_team_name:null}:{})});
      dispatchExpandedCenters.add(centerId);
      renderCentral();
    }
    showToast("ส่งต่อคำร้องให้ศูนย์ย่อยแล้ว");
  } catch (error) {
    showToast("ส่งต่อคำร้องไม่สำเร็จ: " + (error.message || error), true);
  } finally { button.disabled = false; }
}

async function assignSubcenterTeam(button) {
  const card=button.closest(".subcenter-request");
  const teamId=$(".subcenter-assignment-team",card).value;
  if (!teamId) { showToast("กรุณาเลือกชุดปฏิบัติการ",true); return; }
  button.disabled=true;
  try {
    if (online) {
      const {error}=await supabase.rpc("assign_request_to_team_by_subcenter_session",{p_session_token:authSession.session_token,p_request_id:card.dataset.requestId,p_team_id:teamId});
      if (error) throw error;
      await loadSubcenterMission(routeInfo().raw);
    } else {
      const workspace=subcenterSession.data;
      const team=(workspace.teams||[]).find(item=>item.id===teamId);
      const record=(workspace.requests||[]).find(item=>item.request.id===card.dataset.requestId);
      if (!team||!record) throw new Error("ไม่พบคำร้องหรือชุดปฏิบัติการของศูนย์นี้");
      const teamAssignment={assigned_team_id:team.id,assigned_team_no:team.team_no,assigned_team_type:team.team_type,assigned_team_leader:team.leader_name,assigned_team_area:team.operation_area,assigned_team_start_at:team.operation_start_at,assigned_team_end_at:team.operation_end_at,assigned_team_members:team.members||[],assigned_team_name:teamDisplayName(team)};
      Object.assign(record.request,teamAssignment);
      const centralRequest=(centralState?.requests||[]).find(item=>item.id===card.dataset.requestId);
      if (centralRequest) Object.assign(centralRequest,teamAssignment);
      const publicRequest=demoRows.find(item=>item.id===card.dataset.requestId)||demoManage.get(card.dataset.requestId)?.public;
      if (publicRequest) Object.assign(publicRequest,teamAssignment);
      renderSubcenterMission(record,workspace.teams||[]);
    }
    showToast("บันทึกชุดปฏิบัติการที่รับภารกิจแล้ว");
  } catch (error) {
    showToast("มอบหมายชุดปฏิบัติการไม่สำเร็จ: "+(error.message||error),true);
  } finally { button.disabled=false; }
}

async function fetchSubcenterWorkspace() {
  if (!authSession || authSession.role !== "subcenter") throw new Error("กรุณาเข้าสู่ระบบศูนย์ย่อยใหม่");
  if (!online && subcenterSession?.data?.center?.id === authSession.center_id) return subcenterSession.data;
  let data;
  if (online) {
    const result = await supabase.rpc("get_subcenter_workspace_by_session", {p_session_token:authSession.session_token});
    if (result.error) throw result.error;
    data = result.data;
  } else {
    const source = centralState || demoCentralWorkspace();
    const center = (source.centers||[]).find(item => item.id===authSession.center_id) || {id:authSession.center_id,name:authSession.center_name,service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`};
    const assigned = (source.requests||[]).filter(item => item.assigned_center_id===authSession.center_id).map(request => {
      const team = (source.teams||[]).find(item => item.id===request.assigned_team_id);
      return {request:{...request,assigned_team_area:team?.operation_area,assigned_team_start_at:team?.operation_start_at,assigned_team_end_at:team?.operation_end_at,assigned_team_members:team?.members||[]},steps:demoManage.get(request.id)?.steps||STEP_CATALOG.map(([code,name,detail],index)=>({step_code:code,step_order:index+1,step_name:name,step_detail:detail,status:index===0?"completed":"pending",assignee:"",note:""}))};
    });
    data = {
      center,
      volunteers:(source.volunteers||demoVolunteers).filter(item => item.subcenter_id===authSession.center_id),
      teams:(source.teams||[]).filter(item => item.center_id===authSession.center_id),
      requests:assigned
    };
  }
  if (!data) throw new Error("บัญชีไม่มีสิทธิ์หรือศูนย์นี้ถูกปิดใช้งาน");
  subcenterSession = {data};
  return data;
}

async function loadSubcenter() {
  $("#subcenter-content").hidden = true;
  $("#subcenter-loading").hidden = false;
  $("#subcenter-loading").textContent = "กำลังโหลดคำร้องที่ได้รับมอบหมาย…";
  if (!authSession || authSession.role !== "subcenter") { location.hash="login"; return; }
  try {
    const data = await fetchSubcenterWorkspace();
    $("#subcenter-title").textContent = data.center.name;
    $("#subcenter-subtitle").textContent = `พื้นที่รับผิดชอบ: ${normalizeCentralName(data.center.service_areas)}`;
    renderSubcenter();
    $("#subcenter-loading").hidden = true;
    $("#subcenter-content").hidden = false;
  } catch (error) {
    $("#subcenter-loading").textContent = "เปิดพื้นที่ศูนย์ย่อยไม่ได้: " + (error.message || error);
    if (/เซสชัน|สิทธิ์/.test(error.message||"")) {
      localStorage.removeItem(SESSION_KEY);
      authSession = null;
      applyAuthUi();
    }
  }
}

function renderSubcenter() {
  const volunteers = subcenterSession?.data?.volunteers || [];
  const teams = subcenterSession?.data?.teams || [];
  const records = subcenterSession?.data?.requests || [];
  $("#subcenter-kpis").innerHTML = [
    ["กำลังในทะเบียน",volunteers.length,"คน"],
    ["ชุดปฏิบัติการ",teams.length,"ชุด"],
    ["ภารกิจที่ได้รับ",records.length,"รายการ"],
    ["รอเลือกชุดปฏิบัติการ",records.filter(record => !record.request?.assigned_team_id).length,"รายการ"]
  ].map(([label,value,unit],index) => `<article class="kpi-card ${index===0?"kpi-accent":""}"><span>${label}</span><strong>${Number(value).toLocaleString("th-TH")}</strong><small>${unit}</small></article>`).join("");
  renderMemberPicker();
  renderTeams(teams,"#team-list",false);
  $("#subcenter-request-list").innerHTML = records.length ? records.map(record => {
    const request = record.request;
    const status = STATUS[request.overall_status] || STATUS.pending;
    return `<article class="subcenter-mission-card"><a href="#subcenter/mission/${encodeURIComponent(request.id)}" aria-label="เปิดภารกิจ ${escapeHtml(request.request_no)} ${escapeHtml(request.location_name)}"><div class="subcenter-mission-card-top"><span class="team-no">${escapeHtml(request.request_no)}</span><span class="status-chip ${escapeHtml(status[1])}">${escapeHtml(status[0])}</span></div><h3>${escapeHtml(request.location_name)}</h3><p>${escapeHtml(request.mission)}</p><div class="subcenter-mission-card-facts"><span>เริ่มปฏิบัติงาน<strong>${formatDate(request.operation_start_at)}</strong></span><span>ชุดปฏิบัติการ<strong>${escapeHtml(request.assigned_team_no||"ยังไม่เลือกชุด")}</strong></span></div><span class="subcenter-mission-card-action">ดูและอัปเดตภารกิจ →</span></a></article>`;
  }).join("") : `<div class="panel empty-state"><strong>ยังไม่มีคำร้องที่ได้รับมอบหมาย</strong><span>เมื่อ${CENTRAL_NAME}ส่งต่อคำร้อง รายการจะแสดงที่หน้านี้</span></div>`;
}

async function loadSubcenterMission(raw) {
  const loading = $("#subcenter-mission-loading");
  const content = $("#subcenter-mission-content");
  content.hidden = true;
  loading.hidden = false;
  loading.textContent = "กำลังโหลดภารกิจที่ได้รับมอบหมาย…";
  if (!authSession || authSession.role !== "subcenter") { location.hash = "login"; return; }
  try {
    const requestId = decodeURIComponent(raw.slice("subcenter/mission/".length));
    const data = await fetchSubcenterWorkspace();
    const record = (data.requests||[]).find(item => String(item.request?.id) === requestId);
    if (!record) throw new Error("ไม่พบภารกิจนี้ในรายการที่ศูนย์ย่อยได้รับมอบหมาย");
    renderSubcenterMission(record,data.teams||[]);
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.textContent = "เปิดภารกิจไม่ได้: " + (error.message || error);
  }
}

function renderSubcenterMission(record,teams) {
  const request = record.request;
  const status = STATUS[request.overall_status] || STATUS.pending;
  const steps = [...(record.steps||[])].sort((a,b) => a.step_order-b.step_order);
  $("#subcenter-mission-title").textContent = request.location_name || "รายละเอียดภารกิจ";
  $("#subcenter-mission-subtitle").textContent = `${request.request_no || "คำร้อง"} · ${request.mission || "ภารกิจที่ได้รับมอบหมาย"}`;
  $("#subcenter-mission-content").innerHTML = `<article class="subcenter-request subcenter-mission-editor" data-request-id="${escapeHtml(request.id)}"><header class="subcenter-mission-editor-header"><div><span class="team-no">${escapeHtml(request.request_no)}</span><h2>${escapeHtml(request.location_name)}</h2><p>${escapeHtml(request.mission)}</p></div><span class="status-chip ${escapeHtml(status[1])}">${escapeHtml(status[0])}</span></header><div class="subcenter-mission-editor-body"><div class="request-private-grid"><span>ผู้ประสานงาน<strong>${escapeHtml(request.coordinator_name||"–")}</strong><small>${escapeHtml(request.coordinator_org||"")} · ${escapeHtml(request.coordinator_phone||"")}</small></span><span>วันปฏิบัติงาน<strong>${formatDate(request.operation_start_at)}</strong><small>${Number(request.personnel_required||0).toLocaleString("th-TH")} คน</small></span><span>สถานการณ์<strong>${escapeHtml(request.situation||"–")}</strong><small>${escapeHtml(request.impact||"")}</small></span></div><button class="button button-ghost view-request-detail subcenter-detail-button" type="button">ดูข้อมูลคำร้องทั้งหมดและพิกัดแผนที่</button><section class="subcenter-mission-edit-section"><h3>ชุดปฏิบัติการที่รับผิดชอบ</h3>${subcenterTeamAssignmentHtml(request,teams)}${assignedTeamCardHtml(request)}</section><section class="subcenter-mission-edit-section"><h3>อัปเดตขั้นตอนการดำเนินงาน</h3><div class="step-editor sub-step-editor">${steps.map(step=>stepEditorHtml(step,"sub")).join("")}</div></section><section class="subcenter-mission-edit-section"><h3>สรุปผลการช่วยเหลือ</h3><form class="sub-summary-form summary-editor-inline"><label><span>สรุปผลการดำเนินงาน / ข้อสั่งการเพิ่มเติม</span><textarea name="summary" rows="3">${escapeHtml(request.summary||"")}</textarea></label><div class="form-grid cols-2"><label><span>ผู้บันทึก</span><input name="recorder_name" value="${escapeHtml(request.recorder_name||"")}"></label><label><span>ตำแหน่ง</span><input name="recorder_position" value="${escapeHtml(request.recorder_position||"")}"></label></div><div class="align-end"><button class="button button-primary" type="submit">บันทึกสรุปผล</button></div></form></section></div></article>`;
}

async function loadShelter() {
  if (!authSession || authSession.role !== "subcenter") { location.hash = "login"; return; }
  const loading = $("#shelter-loading");
  const content = $("#shelter-content");
  content.hidden = true;
  loading.hidden = false;
  loading.textContent = "กำลังโหลดข้อมูลผู้พักพิง…";
  try {
    if (online) {
      const {data,error} = await supabase.rpc("get_shelter_residents_by_session",{p_session_token:authSession.session_token});
      if (error) throw error;
      shelterRecords = Array.isArray(data) ? data : [];
    } else {
      shelterRecords = demoShelterRecords.filter(item => item.center_id === authSession.center_id);
    }
    $("#shelter-subtitle").textContent = `ศูนย์ย่อย: ${authSession.center_name || authSession.display_name}`;
    renderShelter();
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.textContent = "เปิดข้อมูลผู้พักพิงไม่ได้: " + (error.message || error);
  }
}

function renderShelter() {
  const query = $("#shelter-search").value.trim().toLowerCase();
  const filtered = shelterRecords.filter(item => !query || [item.full_name,item.address,item.phone,item.emergency_contact_name,item.emergency_contact_phone]
    .some(value => String(value || "").toLowerCase().includes(query)))
    .sort((a,b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  shelterPage = Math.min(shelterPage,Math.max(0,Math.ceil(filtered.length/SHELTER_PAGE_SIZE)-1));
  const start = shelterPage*SHELTER_PAGE_SIZE;
  const rows = filtered.slice(start,start+SHELTER_PAGE_SIZE);
  $("#shelter-count").textContent = `ทั้งหมด ${shelterRecords.length.toLocaleString("th-TH")} คน · เห็นเฉพาะข้อมูลของศูนย์นี้`;
  $("#shelter-table-body").innerHTML = rows.length ? rows.map(item => `<tr data-resident-id="${escapeHtml(item.id)}"><td><strong>${escapeHtml(item.full_name)}</strong><span class="cell-sub">${escapeHtml(item.phone)}</span></td><td>${escapeHtml(item.address)}</td><td>${Number(item.companions_count || 0).toLocaleString("th-TH")} คน</td><td><strong>${escapeHtml(item.emergency_contact_name)}</strong><span class="cell-sub">${escapeHtml(item.emergency_contact_phone)}</span></td><td>${formatDate(item.created_at)}</td><td><div class="row-actions shelter-row-actions"><button class="button button-ghost compact-action edit-resident" type="button">แก้ไข</button><button class="button button-danger compact-action delete-resident" type="button">ลบ</button></div></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty-state compact-empty">ยังไม่มีข้อมูลผู้พักพิงตามเงื่อนไข</div></td></tr>`;
  $("#shelter-page-info").textContent = filtered.length ? `แสดง ${start+1}–${start+rows.length} จาก ${filtered.length} คน` : "ไม่พบผู้พักพิง";
  $("#shelter-prev-page").disabled = shelterPage === 0;
  $("#shelter-next-page").disabled = start+SHELTER_PAGE_SIZE >= filtered.length;
}

function resetShelterForm() {
  const form = $("#shelter-form");
  form.reset();
  form.elements.resident_id.value = "";
  $("#shelter-form-title").textContent = "เพิ่มข้อมูลผู้พักพิง";
  $("#shelter-submit").textContent = "บันทึกข้อมูลผู้พักพิง";
  $("#shelter-cancel-edit").hidden = true;
  $("#shelter-form-error").hidden = true;
}

function editShelterResident(id) {
  const item = shelterRecords.find(record => record.id === id);
  if (!item) return;
  const form = $("#shelter-form");
  for (const key of ["resident_id","full_name","address","phone","companions_count","emergency_contact_name","emergency_contact_phone"]) {
    form.elements[key].value = key === "resident_id" ? item.id : item[key] ?? "";
  }
  $("#shelter-form-title").textContent = "แก้ไขข้อมูลผู้พักพิง";
  $("#shelter-submit").textContent = "บันทึกการแก้ไข";
  $("#shelter-cancel-edit").hidden = false;
  $("#shelter-form-error").hidden = true;
  form.scrollIntoView({behavior:"smooth",block:"start"});
  form.elements.full_name.focus({preventScroll:true});
}

function openShelterDeleteDialog(residentId) {
  const resident = shelterRecords.find(item => item.id === residentId);
  if (!resident) return;
  const dialog = $("#shelter-delete-dialog");
  dialog.dataset.residentId = residentId;
  $("#shelter-delete-name").textContent = resident.full_name;
  $("#shelter-delete-error").hidden = true;
  dialog.showModal();
}

async function deleteShelterResident() {
  const dialog = $("#shelter-delete-dialog");
  const residentId = dialog.dataset.residentId;
  const button = $("#confirm-shelter-delete");
  const errorBox = $("#shelter-delete-error");
  button.disabled = true;
  errorBox.hidden = true;
  try {
    if (!authSession || authSession.role !== "subcenter") throw new Error("กรุณาเข้าสู่ระบบศูนย์ย่อยใหม่");
    if (!residentId || !shelterRecords.some(item => item.id === residentId)) throw new Error("ไม่พบข้อมูลผู้พักพิง กรุณารีเฟรชรายการ");
    if (online) {
      const {error} = await supabase.rpc("delete_shelter_resident_by_session",{p_session_token:authSession.session_token,p_resident_id:residentId});
      if (error) throw error;
    } else {
      const index = demoShelterRecords.findIndex(item => item.id === residentId && item.center_id === authSession.center_id);
      if (index < 0) throw new Error("ไม่พบข้อมูลผู้พักพิงของศูนย์นี้");
      demoShelterRecords.splice(index,1);
    }
    if ($("#shelter-form").elements.resident_id.value === residentId) resetShelterForm();
    shelterRecords = shelterRecords.filter(item => item.id !== residentId);
    dialog.close();
    renderShelter();
    showToast("ลบข้อมูลผู้พักพิงแล้ว");
  } catch (error) {
    errorBox.textContent = "ลบข้อมูลไม่สำเร็จ: " + (error.message || error);
    errorBox.hidden = false;
  } finally { button.disabled = false; }
}

async function saveShelterResident(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  const residentId = payload.resident_id || null;
  delete payload.resident_id;
  payload.companions_count = Number(payload.companions_count);
  const errorBox = $("#shelter-form-error");
  const button = $("#shelter-submit");
  errorBox.hidden = true;
  button.disabled = true;
  try {
    if (!authSession || authSession.role !== "subcenter") throw new Error("กรุณาเข้าสู่ระบบศูนย์ย่อยใหม่");
    if (online) {
      const {error} = await supabase.rpc("save_shelter_resident_by_session",{p_session_token:authSession.session_token,p_payload:payload,p_resident_id:residentId});
      if (error) throw error;
    } else if (residentId) {
      const item = demoShelterRecords.find(record => record.id === residentId && record.center_id === authSession.center_id);
      if (!item) throw new Error("ไม่พบข้อมูลผู้พักพิงของศูนย์นี้");
      Object.assign(item,payload, {updated_at:new Date().toISOString()});
    } else {
      demoShelterRecords.push({id:`demo-resident-${Date.now()}`,center_id:authSession.center_id,...payload,created_at:new Date().toISOString()});
    }
    resetShelterForm();
    shelterPage = 0;
    $("#shelter-search").value = "";
    await loadShelter();
    showToast(residentId ? "แก้ไขข้อมูลผู้พักพิงแล้ว" : "บันทึกข้อมูลผู้พักพิงแล้ว");
  } catch (error) {
    errorBox.textContent = "บันทึกไม่สำเร็จ: " + (error.message || error);
    errorBox.hidden = false;
  } finally { button.disabled = false; }
}

function subcenterTeamAssignmentHtml(request,teams) {
  const selected=request.assigned_team_id||"";
  const hasTeams=teams.length>0;
  return `<form class="subcenter-team-assignment"><label><span>ชุดปฏิบัติการของศูนย์ *</span><select class="subcenter-assignment-team" ${hasTeams?"":"disabled"}><option value="">${hasTeams?"เลือกชุดปฏิบัติการ":"ยังไม่มีชุดปฏิบัติการ กรุณาจัดชุดก่อน"}</option>${teams.map(team=>`<option value="${team.id}" ${selected===team.id?"selected":""}>${escapeHtml(teamDisplayName(team))} · ${escapeHtml(team.leader_name||"ไม่ระบุหัวหน้าชุด")}</option>`).join("")}</select></label><button class="button button-primary assign-subcenter-team" type="button" ${hasTeams?"":"disabled"}>${selected?"เปลี่ยนชุดปฏิบัติการ":"มอบหมายให้ชุดปฏิบัติการ"}</button></form>`;
}

function assignedTeamCardHtml(request) {
  if (!request.assigned_team_id && !request.assigned_team_no) return `<section class="assigned-team-card assigned-team-empty"><strong>ยังไม่ได้ระบุชุดปฏิบัติการ</strong><span>เลือกชุดปฏิบัติการของศูนย์เพื่อรับภารกิจนี้</span></section>`;
  const members = Array.isArray(request.assigned_team_members) ? request.assigned_team_members : [];
  const typeName = (TEAM_TYPES[request.assigned_team_type]||[request.assigned_team_type||"ชุดปฏิบัติการ"])[0];
  return `<section class="assigned-team-card"><div class="assigned-team-heading"><div><span class="team-no">ชุดที่ได้รับมอบหมาย</span><h3>${escapeHtml(request.assigned_team_no||"ชุดปฏิบัติการ")}</h3><p>${escapeHtml(typeName)}</p></div><span class="status-chip completed">${members.length.toLocaleString("th-TH")} คน</span></div><div class="assigned-team-facts"><span>หัวหน้าชุด<strong>${escapeHtml(request.assigned_team_leader||"–")}</strong></span><span>พื้นที่ปฏิบัติงาน<strong>${escapeHtml(request.assigned_team_area||"–")}</strong></span><span>กำหนดการ<strong>${formatDate(request.assigned_team_start_at||request.operation_start_at)}</strong><small>${request.assigned_team_end_at?`ถึง ${formatDate(request.assigned_team_end_at)}`:""}</small></span></div><div class="assigned-team-members"><strong>รายชื่อสมาชิกชุด</strong>${members.length?`<ul>${members.map(member=>{const role=member.role||member.skills||"สมาชิก";return `<li><span>${escapeHtml(member.full_name||"–")}</span><small>${escapeHtml(role)}${member.is_leader&&!/หัวหน้า/.test(role)?" · หัวหน้าชุด":""}</small></li>`;}).join("")}</ul>`:`<p>ยังไม่มีรายชื่อสมาชิกในชุดนี้</p>`}</div></section>`;
}

function requestLocation(request) {
  const raw = String(request.operation_point || "");
  const coordinateMatch = raw.match(/พิกัด:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  const latitude = Number(request.operation_latitude ?? coordinateMatch?.[1]);
  const longitude = Number(request.operation_longitude ?? coordinateMatch?.[2]);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const description = raw.split(/\s*\|\s*พิกัด:/i)[0].trim() || "ไม่ได้ระบุรายละเอียดจุดปฏิบัติงาน";
  return {description,hasCoordinates,latitude,longitude,mapUrl:hasCoordinates?googleMapsUrl(latitude,longitude):""};
}

function detailItem(label,value,full=false) {
  return `<div class="request-detail-item ${full?"full":""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "–")}</dd></div>`;
}

function requestTeamDetails(request) {
  const team = (centralState?.teams||[]).find(item => item.id===request.assigned_team_id);
  const members = Array.isArray(request.assigned_team_members) ? request.assigned_team_members : (Array.isArray(team?.members) ? team.members : []);
  return {
    name: request.assigned_team_name || [request.assigned_team_no||team?.team_no,(TEAM_TYPES[request.assigned_team_type||team?.team_type]||[request.assigned_team_type||team?.team_type])[0]].filter(Boolean).join(" · "),
    leader: request.assigned_team_leader || team?.leader_name,
    area: request.assigned_team_area || team?.operation_area,
    members
  };
}

function openRequestDetails(request) {
  if (!request) return;
  const dialog = $("#request-detail-dialog");
  const location = requestLocation(request);
  const teamDetails = requestTeamDetails(request);
  const status = STATUS[request.overall_status] || STATUS.pending;
  $("#request-detail-no").textContent = request.request_no || "คำร้อง";
  $("#request-detail-title").textContent = request.location_name || "รายละเอียดคำร้อง";
  $("#request-detail-subtitle").textContent = `${PRIORITY[request.priority] || "ปกติ"} · ${status[0]}`;
  $("#request-detail-content").innerHTML = `
    <section class="request-detail-section"><h3>ข้อมูลผู้แจ้งและการรับเรื่อง</h3><dl class="request-detail-grid">${detailItem("ประเภทผู้แจ้ง",request.requester_type === "agency" ? "หน่วยงาน" : "ประชาชน")}${detailItem("ชื่อผู้แจ้ง / หน่วยงาน",request.requester_name)}${detailItem("วันและเวลารับคำขอ",formatDate(request.received_at))}${detailItem("ช่องทางรับเรื่อง",request.received_by)}</dl></section>
    <section class="request-detail-section"><h3>สถานที่และความต้องการ</h3><dl class="request-detail-grid">${detailItem("ชื่อสถานที่",request.location_name)}${detailItem("หน่วยงาน / สถานศึกษา",request.organization)}${detailItem("จุดปฏิบัติงาน",location.description,true)}${detailItem("สถานการณ์ปัจจุบัน",request.situation,true)}${detailItem("ผลกระทบ",request.impact,true)}${detailItem("ภารกิจหรือความช่วยเหลือที่ต้องการ",request.mission,true)}</dl></section>
    <section class="request-detail-section"><h3>กำหนดการและการประสานงาน</h3><dl class="request-detail-grid">${detailItem("กำลังพลที่ต้องการ",`${Number(request.personnel_required||0).toLocaleString("th-TH")} คน`)}${detailItem("ระดับความเร่งด่วน",PRIORITY[request.priority] || "ปกติ")}${detailItem("เริ่มปฏิบัติงาน",formatDate(request.operation_start_at))}${detailItem("สิ้นสุดโดยประมาณ",request.operation_end_at ? formatDate(request.operation_end_at) : "ไม่ได้ระบุ")}${detailItem("ชื่อผู้ประสานงาน",request.coordinator_name)}${detailItem("หน่วยงานผู้ประสานงาน",request.coordinator_org)}${detailItem("หมายเลขโทรศัพท์",request.coordinator_phone)}${detailItem("ศูนย์ย่อยที่รับผิดชอบ",request.assigned_center_name || subcenterSession?.data?.center?.name || "ยังไม่มอบหมาย")}${detailItem("ชุดปฏิบัติการที่รับผิดชอบ",teamDetails.name || "ยังไม่มอบหมาย")}${detailItem("หัวหน้าชุด",teamDetails.leader || "ยังไม่ระบุ")}${detailItem("พื้นที่ของชุดปฏิบัติการ",teamDetails.area || "ยังไม่ระบุ",true)}${detailItem("สมาชิกชุดปฏิบัติการ",teamDetails.members.length?teamDetails.members.map(member=>`${member.full_name||"–"}${member.role?` (${member.role})`:""}`).join(" · "):"ยังไม่มีรายชื่อสมาชิก",true)}${detailItem("ข้อสั่งการ / หมายเหตุการมอบหมาย",request.assignment_note || "ยังไม่มี",true)}</dl></section>`;
  $("#request-detail-location-text").textContent = location.hasCoordinates ? `${location.description} · ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : location.description;
  const mapElement = $("#request-detail-map");
  const emptyElement = $("#request-detail-map-empty");
  const mapLink = $("#request-detail-map-link");
  mapElement.hidden = !location.hasCoordinates;
  emptyElement.hidden = location.hasCoordinates;
  mapLink.hidden = !location.hasCoordinates;
  mapLink.href = location.mapUrl || "#";
  dialog.showModal();
  if (location.hasCoordinates && window.L) requestAnimationFrame(() => {
    if (!requestDetailMap) {
      requestDetailMap = L.map("request-detail-map", {scrollWheelZoom:false});
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(requestDetailMap);
    }
    if (requestDetailMarker) requestDetailMarker.remove();
    requestDetailMarker = L.marker([location.latitude,location.longitude]).addTo(requestDetailMap);
    requestDetailMap.setView([location.latitude,location.longitude],16);
    requestDetailMap.invalidateSize();
  });
}

function requestFromDetailButton(button) {
  const requestId = button.closest("[data-request-id]")?.dataset.requestId;
  if (!requestId) return null;
  if (["subcenter","subcenter-mission"].includes(routeInfo().name)) return subcenterSession?.data?.requests?.find(record => record.request?.id === requestId)?.request;
  return centralState?.requests?.find(request => request.id === requestId);
}

function stepEditorHtml(step,mode="legacy") {
  return `<div class="step-row" data-code="${escapeHtml(step.step_code)}"><span class="step-no">${step.step_order}</span><div class="step-name"><strong>${escapeHtml(step.step_name)}</strong><span>${escapeHtml(step.step_detail)}</span></div><input class="step-assignee" value="${escapeHtml(step.assignee||"")}" placeholder="ผู้รับผิดชอบ"><select class="step-status">${Object.entries(STATUS).map(([value,item])=>`<option value="${value}" ${step.status===value?"selected":""}>${item[0]}</option>`).join("")}</select><input class="step-note" value="${escapeHtml(step.note||"")}" placeholder="ผล / หมายเหตุ"><button class="button button-ghost ${mode==="sub"?"save-sub-step":"save-step"}" type="button">บันทึก</button></div>`;
}

async function saveSubcenterStep(button) {
  const requestRoot = button.closest(".subcenter-request");
  const row = button.closest(".step-row");
  const payload = {requestId:requestRoot.dataset.requestId,stepCode:row.dataset.code,status:$(".step-status",row).value,assignee:$(".step-assignee",row).value,note:$(".step-note",row).value};
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("update_workflow_step_by_staff", {p_session_token:authSession.session_token,p_request_id:payload.requestId,p_step_code:payload.stepCode,p_status:payload.status,p_assignee:payload.assignee,p_note:payload.note});
      if (error) throw error;
    } else {
      const record = subcenterSession.data.requests.find(item=>item.request.id===payload.requestId);
      Object.assign(record.steps.find(item=>item.step_code===payload.stepCode),{status:payload.status,assignee:payload.assignee,note:payload.note});
    }
    showToast("บันทึกขั้นตอนแล้ว");
  } catch (error) { showToast("บันทึกไม่สำเร็จ: " + (error.message||error),true); }
  finally { button.disabled = false; }
}

async function saveSubcenterSummary(form) {
  const requestId = form.closest(".subcenter-request").dataset.requestId;
  const payload = Object.fromEntries(new FormData(form));
  const button = $("button[type=submit]",form);
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("update_request_summary_by_staff", {p_session_token:authSession.session_token,p_request_id:requestId,p_summary:payload.summary,p_recorder_name:payload.recorder_name,p_recorder_position:payload.recorder_position});
      if (error) throw error;
    } else {
      Object.assign(subcenterSession.data.requests.find(item=>item.request.id===requestId).request,payload);
    }
    showToast("บันทึกสรุปผลแล้ว");
  } catch (error) { showToast("บันทึกไม่สำเร็จ: " + (error.message||error),true); }
  finally { button.disabled = false; }
}

async function loadManage(raw) {
  const [,requestId,token] = raw.split("/");
  $("#manage-content").hidden = true;
  $("#manage-loading").hidden = false;
  if (!requestId || !token) { $("#manage-loading").textContent = "ลิงก์จัดการไม่ครบถ้วน"; return; }
  try {
    let record;
    if (online) {
      const {data,error} = await supabase.rpc("get_request_by_token", {p_request_id:requestId,p_edit_token:token});
      if (error) throw error;
      record = data;
    } else {
      record = demoManage.get(requestId);
      if (!record || record.token !== token) throw new Error("ไม่พบข้อมูลในโหมดตัวอย่าง");
    }
    if (!record) throw new Error("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    renderManage(record,requestId,token);
    $("#manage-loading").hidden = true;
    $("#manage-content").hidden = false;
  } catch (error) { $("#manage-loading").textContent = "เปิดคำร้องไม่ได้: " + (error.message||error); }
}

function renderManage(record,requestId,token) {
  const request = record.request || record;
  const steps = record.steps || [];
  $("#manage-title").textContent = request.request_no;
  $("#manage-subtitle").textContent = `${request.location_name} · ${request.mission}`;
  $("#manage-summary").innerHTML = `<div class="summary-tile"><span>สถานที่และภารกิจ</span><strong>${escapeHtml(request.location_name)}</strong><small>${escapeHtml(request.mission)}</small></div><div class="summary-tile"><span>วันปฏิบัติงาน</span><strong>${formatDate(request.operation_start_at)}</strong></div><div class="summary-tile"><span>กำลังพลที่ต้องการ</span><strong>${Number(request.personnel_required).toLocaleString("th-TH")} คน</strong></div>`;
  $("#step-editor").innerHTML = steps.sort((a,b)=>a.step_order-b.step_order).map(step=>stepEditorHtml(step)).join("");
  const form = $("#summary-form");
  form.elements.summary.value = request.summary||"";
  form.elements.recorder_name.value = request.recorder_name||"";
  form.elements.recorder_position.value = request.recorder_position||"";
  $("#manage-content").dataset.requestId = requestId;
  $("#manage-content").dataset.token = token;
}

async function saveLegacyStep(button) {
  const row = button.closest(".step-row");
  const {requestId,token} = $("#manage-content").dataset;
  const payload = {stepCode:row.dataset.code,status:$(".step-status",row).value,assignee:$(".step-assignee",row).value,note:$(".step-note",row).value};
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("update_workflow_step_by_token", {p_request_id:requestId,p_edit_token:token,p_step_code:payload.stepCode,p_status:payload.status,p_assignee:payload.assignee,p_note:payload.note});
      if (error) throw error;
    } else {
      Object.assign(demoManage.get(requestId).steps.find(step=>step.step_code===payload.stepCode),payload);
    }
    showToast("บันทึกขั้นตอนแล้ว");
  } catch (error) { showToast("บันทึกไม่สำเร็จ: " + (error.message||error),true); }
  finally { button.disabled = false; }
}

async function saveLegacySummary(event) {
  event.preventDefault();
  const {requestId,token} = $("#manage-content").dataset;
  const payload = Object.fromEntries(new FormData(event.currentTarget));
  try {
    if (online) {
      const {error} = await supabase.rpc("update_request_summary_by_token", {p_request_id:requestId,p_edit_token:token,p_summary:payload.summary,p_recorder_name:payload.recorder_name,p_recorder_position:payload.recorder_position});
      if (error) throw error;
    } else Object.assign(demoManage.get(requestId).request,payload);
    showToast("บันทึกสรุปผลแล้ว");
  } catch (error) { showToast("บันทึกไม่สำเร็จ: " + (error.message||error),true); }
}

function subscribeRealtime() {
  if (!online) return;
  realtimeChannel = supabase.channel("public-dashboard-v2").on("postgres_changes",{event:"*",schema:"public",table:"public_requests"},() => {
    if (routeInfo().name === "dashboard") loadDashboard();
  }).subscribe(status => { if (status === "SUBSCRIBED") setConnectionState("connected"); });
}

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  Promise.resolve(context.registerTool({
    name:"create_service_request",
    title:"สร้างคำร้องช่วยเหลือ",
    description:"สร้างคำร้องใหม่จากข้อมูลที่ครบถ้วนและคืนเลขที่คำร้อง",
    inputSchema:{
      type:"object",
      properties:{requester_type:{type:"string",enum:["citizen","agency"]},requester_name:{type:"string"},received_by:{type:"string"},location_name:{type:"string"},situation:{type:"string"},mission:{type:"string"},personnel_required:{type:"integer",minimum:1},operation_start_at:{type:"string"},coordinator_name:{type:"string"},coordinator_org:{type:"string"},coordinator_phone:{type:"string"},priority:{type:"string",enum:["normal","urgent","critical"]}},
      required:["requester_name","received_by","location_name","situation","mission","personnel_required","operation_start_at","coordinator_name","coordinator_phone"],
      additionalProperties:true
    },
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    async execute(input){
      const result=await createRequest({...input,requester_type:input.requester_type||"citizen",received_at:new Date().toISOString()});
      return {request_no:result.request_no};
    }
  },{signal:lifecycle.signal})).catch(()=>{});
}

$("#volunteer-form").addEventListener("submit",handleVolunteerSubmit);
attachNationalIdValidation($("#volunteer-form"));
$("#volunteer-form").addEventListener("change",event => {
  if (event.target.name === "availability_time_slots") $("#availability-time-error").hidden = true;
  if (event.target.name === "vehicle_types") $("#vehicle-type-error").hidden = true;
  if (event.target.name === "availability_start_date") {
    const endDate = event.currentTarget.elements.availability_end_date;
    endDate.min = event.target.value;
    endDate.setCustomValidity("");
  }
});
$("#request-form").addEventListener("submit",handleRequestSubmit);
$("#use-current-location").addEventListener("click",useCurrentLocation);
$("#clear-operation-pin").addEventListener("click",clearOperationPin);
$("#search-input").addEventListener("input",() => { dashboardPage=0; renderRequestTable(); });
$("#status-filter").addEventListener("change",() => { dashboardPage=0; renderRequestTable(); });
$("#date-filter").addEventListener("change",() => { dashboardPage=0; renderRequestTable(); });
$("#dashboard-prev-page").addEventListener("click",() => { if (dashboardPage>0) { dashboardPage--; renderRequestTable(); } });
$("#dashboard-next-page").addEventListener("click",() => { dashboardPage++; renderRequestTable(); });
$("#request-table-body").addEventListener("click",event => {
  const button=event.target.closest(".dashboard-request-link");
  if (!button || !authSession) return;
  const row=requestRows.find(item => String(item.id)===button.dataset.requestId);
  if (!row) return;
  if (authSession.role === "subcenter") location.hash=`subcenter/mission/${encodeURIComponent(row.id)}`;
  else if (authSession.role === "central") openRequestDetails(row);
});
$("#volunteer-search").addEventListener("input",() => { volunteerPage=0; renderCentralVolunteers(); });
$("#volunteer-group-filter").addEventListener("change",() => { volunteerPage=0; renderCentralVolunteers(); });
$("#volunteer-prev-page").addEventListener("click",() => { if (volunteerPage>0) { volunteerPage--; renderCentralVolunteers(); } });
$("#volunteer-next-page").addEventListener("click",() => { volunteerPage++; renderCentralVolunteers(); });
$("#volunteer-table-body").addEventListener("click",event => {
  const row = event.target.closest("tr[data-volunteer-id]");
  if (!row) return;
  if (event.target.closest(".edit-volunteer")) openVolunteerEditor(row.dataset.volunteerId);
  if (event.target.closest(".delete-volunteer")) openVolunteerDeleteDialog(row.dataset.volunteerId);
});
$("#volunteer-edit-form").addEventListener("submit",saveVolunteerEdit);
attachNationalIdValidation($("#volunteer-edit-form"));
$("#cancel-volunteer-edit").addEventListener("click",() => $("#volunteer-edit-dialog").close());
$("#cancel-volunteer-delete").addEventListener("click",() => $("#volunteer-delete-dialog").close());
$("#confirm-volunteer-delete").addEventListener("click",deleteVolunteer);
$("#shelter-form").addEventListener("submit",saveShelterResident);
$("#shelter-cancel-edit").addEventListener("click",resetShelterForm);
$("#shelter-refresh").addEventListener("click",loadShelter);
$("#shelter-search").addEventListener("input",() => { shelterPage=0; renderShelter(); });
$("#shelter-prev-page").addEventListener("click",() => { if (shelterPage>0) { shelterPage--; renderShelter(); } });
$("#shelter-next-page").addEventListener("click",() => { shelterPage++; renderShelter(); });
$("#cancel-shelter-delete").addEventListener("click",() => $("#shelter-delete-dialog").close());
$("#confirm-shelter-delete").addEventListener("click",deleteShelterResident);
$("#shelter-table-body").addEventListener("click",event => {
  const row = event.target.closest("tr[data-resident-id]");
  if (!row) return;
  if (event.target.closest(".edit-resident")) editShelterResident(row.dataset.residentId);
  if (event.target.closest(".delete-resident")) openShelterDeleteDialog(row.dataset.residentId);
});
$("#team-member-picker").addEventListener("change",updateTeamMemberCount);
$("#team-leader").addEventListener("change",event => {
  const checkbox = $(`#team-member-picker input[value="${event.target.value}"]`);
  if (checkbox) checkbox.checked = true;
  updateTeamMemberCount();
});
$("#team-form").addEventListener("submit",handleTeamSubmit);
$("#login-form").addEventListener("submit",handleLogin);
$("#logout-button").addEventListener("click",logoutStaff);
const appHeader = $(".app-header");
const menuToggle = $("#menu-toggle");
function closeNavigationMenu() {
  appHeader.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded","false");
}
menuToggle.addEventListener("click",event => {
  event.stopPropagation();
  const isOpen = appHeader.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded",String(isOpen));
});
$("#main-navigation").addEventListener("click",event => {
  if (event.target.closest("a,button")) closeNavigationMenu();
});
document.addEventListener("click",event => {
  if (!appHeader.contains(event.target)) closeNavigationMenu();
});
document.addEventListener("keydown",event => {
  if (event.key === "Escape") closeNavigationMenu();
});
window.addEventListener("resize",() => {
  if (window.innerWidth > 1100) closeNavigationMenu();
});
$("#dispatch-team-list").addEventListener("click",event => { if (event.target.closest(".toggle-dispatch-teams")) { dispatchTeamsExpanded=!dispatchTeamsExpanded; renderDispatchTeams(); } });
$("#assignment-list").addEventListener("toggle",event => { const group=event.target.closest(".dispatch-center-group"); if (!group) return; if (group.open) dispatchExpandedCenters.add(group.dataset.centerId); else dispatchExpandedCenters.delete(group.dataset.centerId); },true);
$("#assignment-list").addEventListener("click",event => { const detailButton=event.target.closest(".view-request-detail"); if (detailButton) { openRequestDetails(requestFromDetailButton(detailButton)); return; } const button=event.target.closest(".assign-request"); if (button) assignRequest(button); });
$("#subcenter-mission-content").addEventListener("click",event => { const detailButton=event.target.closest(".view-request-detail"); if (detailButton) { openRequestDetails(requestFromDetailButton(detailButton)); return; } const teamButton=event.target.closest(".assign-subcenter-team"); if (teamButton) { assignSubcenterTeam(teamButton); return; } const button=event.target.closest(".save-sub-step"); if (button) saveSubcenterStep(button); });
$("#subcenter-mission-content").addEventListener("submit",event => { const form=event.target.closest(".sub-summary-form"); if (form) { event.preventDefault(); saveSubcenterSummary(form); } });
$("#step-editor").addEventListener("click",event => { const button=event.target.closest(".save-step"); if (button) saveLegacyStep(button); });
$("#summary-form").addEventListener("submit",saveLegacySummary);
$("#request-another").addEventListener("click",() => { $("#request-success-dialog").close(); location.hash="new"; });
$("#go-dashboard").addEventListener("click",() => { $("#request-success-dialog").close(); location.hash="dashboard"; });
$("#register-another").addEventListener("click",() => $("#volunteer-success-dialog").close());
$("#go-home").addEventListener("click",() => { $("#volunteer-success-dialog").close(); location.hash="home"; });
window.addEventListener("hashchange",() => { closeNavigationMenu(); route(); });
window.addEventListener("beforeunload",() => { if (realtimeChannel) supabase.removeChannel(realtimeChannel); });

$("#connection-banner").hidden = online;
async function bootstrap() {
  initializeStaticOptions();
  await restoreSession();
  subscribeRealtime();
  registerWebMcpTools();
  route();
}
bootstrap();
