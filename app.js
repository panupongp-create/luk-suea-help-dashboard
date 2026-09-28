import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";

const config = window.APP_CONFIG || {};
const online = Boolean(config.SUPABASE_URL && config.SUPABASE_PUBLISHABLE_KEY);
const supabase = online ? createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY) : null;
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
  {id:"d1",request_no:"REQ-20260927-00004",requester_type:"agency",requester_name:"โรงเรียนบ้านหนองน้ำใส",received_at:new Date().toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"โรงเรียนบ้านหนองน้ำใส",organization:"สำนักงานเขตพื้นที่การศึกษา",operation_point:"อาคารอเนกประสงค์ด้านทิศตะวันออก | พิกัด: 13.756300, 100.501800 | แผนที่: https://www.openstreetmap.org/?mlat=13.756300&mlon=100.501800#map=16/13.756300/100.501800",situation:"มีสิ่งของช่วยเหลือเข้ามาจำนวนมากและต้องจัดพื้นที่รับมอบ",impact:"ทางเดินและพื้นที่ใช้งานบางส่วนไม่เพียงพอ",mission:"สนับสนุนการจัดพื้นที่และขนย้ายสิ่งของ",personnel_required:12,operation_start_at:new Date(now+86400000).toISOString(),operation_end_at:new Date(now+118800000).toISOString(),priority:"urgent",coordinator_name:"ผู้ประสานงานโรงเรียน",coordinator_org:"โรงเรียนบ้านหนองน้ำใส",coordinator_phone:"081-000-0001",overall_status:"in_progress",current_step:"จัดกำลัง",completed_steps:4,assigned_center_name:"ศูนย์ประสานงานจังหวัดตัวอย่าง",assigned_team_name:"TEAM-20260928-0001 · ชุดจัดเตรียมและสนับสนุนสิ่งของช่วยเหลือ"},
  {id:"d2",request_no:"REQ-20260927-00003",requester_type:"citizen",requester_name:"ผู้แทนชุมชนริมคลอง",received_at:new Date(now-7200000).toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"ชุมชนริมคลอง",organization:"เทศบาลตำบล",operation_point:"ศาลาชุมชนใกล้สะพาน",situation:"ประชาชนทยอยนำสิ่งของมาบริจาคและการจราจรเริ่มหนาแน่น",impact:"จุดรับบริจาคยังไม่มีระบบคัดแยก",mission:"ช่วยจัดระเบียบพื้นที่และประสานจุดรับบริจาค",personnel_required:18,operation_start_at:new Date(now+18000000).toISOString(),operation_end_at:null,priority:"critical",coordinator_name:"ผู้ใหญ่บ้านตัวอย่าง",coordinator_org:"ชุมชนริมคลอง",coordinator_phone:"081-000-0002",overall_status:"blocked",current_step:"ประเมินความปลอดภัย",completed_steps:2,assigned_team_name:null},
  {id:"d3",request_no:"REQ-20260926-00002",requester_type:"agency",requester_name:"ศูนย์พักพิงชั่วคราว",received_at:new Date(now-86400000).toISOString(),received_by:"ระบบรับคำร้องออนไลน์",location_name:"ศูนย์พักพิงชั่วคราว",organization:"องค์การบริหารส่วนตำบล",operation_point:"อาคารประชุมชั้น 1",situation:"มีผู้พักพิงเพิ่มขึ้นต่อเนื่อง",impact:"เจ้าหน้าที่ครัวและผู้กระจายสิ่งของไม่เพียงพอ",mission:"จัดชุดช่วยงานครัวและกระจายสิ่งของ",personnel_required:20,operation_start_at:new Date(now+172800000).toISOString(),operation_end_at:null,priority:"normal",coordinator_name:"เจ้าหน้าที่ศูนย์พักพิง",coordinator_org:"องค์การบริหารส่วนตำบล",coordinator_phone:"081-000-0003",overall_status:"pending",current_step:"ตรวจสอบ",completed_steps:1,assigned_team_name:null}
];

const demoVolunteers = [
  {id:"v1",registration_no:"VOL-20260927-00001",group_no:1,scoutdd_id:"SDD-1001",national_id:"1100000000001",full_name:"กิตติพงศ์ ใจอาสา",organization_network:"สำนักงานลูกเสือแห่งชาติ",phone:"081-111-1111",operational_areas:"กรุงเทพมหานครและปริมณฑล",skills:"ประสานงาน จัดการคลังสิ่งของ",vehicle:"รถยนต์",equipment:"วิทยุสื่อสาร",availability_details:"พร้อมวันทำการ",active:true},
  {id:"v2",registration_no:"VOL-20260927-00002",group_no:2,scoutdd_id:"SDD-1024",national_id:"1100000000002",full_name:"ปภังกร พร้อมช่วย",organization_network:"กองลูกเสือจังหวัด",phone:"082-222-2222",operational_areas:"นนทบุรี ปทุมธานี",skills:"ปฐมพยาบาล งานครัว",vehicle:"รถกระบะ",equipment:"ชุดปฐมพยาบาล",availability_details:"เสาร์และอาทิตย์",active:true},
  {id:"v3",registration_no:"VOL-20260927-00003",group_no:3,scoutdd_id:"",national_id:"1100000000003",full_name:"ณัฐวุฒิ นักบุกเบิก",organization_network:"เครือข่ายวิทยากร",phone:"083-333-3333",operational_areas:"ภาคกลาง",skills:"บุกเบิก กู้ภัยทางน้ำ",vehicle:"เรือท้องแบน",equipment:"เชือก เสื้อชูชีพ",availability_details:"แจ้งล่วงหน้า 1 วัน",active:true},
  {id:"v4",registration_no:"VOL-20260927-00004",group_no:6,scoutdd_id:"",national_id:"1100000000004",full_name:"พรทิพย์ มีน้ำใจ",organization_network:"เครือข่ายจิตอาสา",phone:"084-444-4444",operational_areas:"กรุงเทพมหานคร",skills:"ดูแลเด็กและงานทะเบียน",vehicle:"",equipment:"โน้ตบุ๊ก",availability_details:"ทุกวันหลัง 17.00 น.",active:true}
];

let requestRows = [];
let volunteerStats = [];
let centralState = null;
let subcenterSession = null;
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
  if (raw === "subcenter" || raw.startsWith("subcenter/")) return {name:"subcenter",raw};
  if (raw.startsWith("manage/")) return {name:"manage",raw};
  return {name:raw,raw};
}

function route() {
  const info = routeInfo();
  const allowed = ["home","registry","dashboard","new","login","center","dispatch","subcenter","manage"];
  let name = allowed.includes(info.name) ? info.name : "home";
  if (["center","dispatch","subcenter"].includes(name) && !authSession) {
    location.hash = "login";
    return;
  }
  if (["center","dispatch"].includes(name) && authSession?.role !== "central") {
    location.hash = "subcenter";
    return;
  }
  if (name === "subcenter" && authSession?.role !== "subcenter") {
    location.hash = "center";
    return;
  }
  if (name === "login" && authSession) {
    location.hash = authSession.role === "central" ? "center" : "subcenter";
    return;
  }
  $$(".view").forEach(view => { view.hidden = view.id !== `${name}-view`; });
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === name));
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
  localStorage.removeItem(SESSION_KEY);
  applyAuthUi();
  location.hash = "home";
  if (online && token) await supabase.rpc("logout_staff", {p_session_token:token});
  showToast("ออกจากระบบแล้ว");
}

function initializeStaticOptions() {
  $("#group-selector").innerHTML = GROUPS.map((group,index) => `<label class="group-option"><input type="radio" name="group_no" value="${index+1}" ${index===0?"checked":""} required><span><strong>กลุ่ม ${index+1}</strong>${escapeHtml(group)}</span></label>`).join("");
  $("#volunteer-group-filter").innerHTML += GROUPS.map((group,index) => `<option value="${index+1}">กลุ่ม ${index+1} · ${escapeHtml(group)}</option>`).join("");
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
  link.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
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
      const {data,error} = await supabase.rpc("get_public_volunteer_stats");
      if (error) throw error;
      volunteerStats = data || [];
    } else {
      volunteerStats = GROUPS.map((_,index) => ({group_no:index+1,total:demoVolunteers.filter(item => item.group_no===index+1).length,available:demoVolunteers.filter(item => item.group_no===index+1 && item.active).length}));
    }
    renderRegistryStats();
  } catch (error) {
    showToast("โหลดสรุปทะเบียนไม่สำเร็จ: " + (error.message || error), true);
  }
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
  payload.group_no = Number(payload.group_no);
  payload.availability_details = `วันที่ ${formatVolunteerDate(startDate)}–${formatVolunteerDate(endDate)} · เวลา ${timeSlots.join(", ")}`;
  payload.vehicle = vehicleTypes.join(", ");
  return payload;
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
  setConnectionState(online ? "connecting" : "demo");
  if (online) {
    const {data,error} = await supabase.from("public_requests").select("*").order("received_at", {ascending:false}).limit(500);
    if (error) { showToast("โหลด Dashboard ไม่สำเร็จ: " + error.message, true); return; }
    requestRows = data || [];
    setConnectionState("connected");
  } else {
    requestRows = [...demoRows,...[...demoManage.values()].map(item => item.public)];
  }
  renderDashboard();
}

function renderDashboard() {
  $("#kpi-total").textContent = requestRows.length.toLocaleString("th-TH");
  $("#kpi-active").textContent = requestRows.filter(row => ["pending","in_progress"].includes(row.overall_status)).length.toLocaleString("th-TH");
  $("#kpi-blocked").textContent = requestRows.filter(row => row.overall_status === "blocked").length.toLocaleString("th-TH");
  $("#kpi-done").textContent = requestRows.filter(row => row.overall_status === "completed").length.toLocaleString("th-TH");
  $("#kpi-people").textContent = requestRows.reduce((sum,row) => sum + Number(row.personnel_required||0),0).toLocaleString("th-TH");
  renderStatusChart();
  renderUrgentList();
  renderRequestTable();
}

function renderStatusChart() {
  $("#status-chart").innerHTML = Object.keys(STATUS).map(key => {
    const count = requestRows.filter(row => row.overall_status === key).length;
    const percent = requestRows.length ? Math.round((count/requestRows.length)*100) : 0;
    return `<div class="bar-row"><span>${STATUS[key][0]}</span><div class="bar-track"><div class="bar-fill ${key}" style="width:${percent}%"></div></div><strong>${count}</strong></div>`;
  }).join("");
}

function renderUrgentList() {
  const ordered = requestRows.filter(row => row.overall_status !== "completed").sort((a,b) => {
    const rank = {critical:0,urgent:1,normal:2};
    return (rank[a.priority]-rank[b.priority]) || new Date(a.operation_start_at)-new Date(b.operation_start_at);
  }).slice(0,4);
  $("#urgent-list").innerHTML = ordered.length ? ordered.map(row => `<article class="urgent-item"><i class="urgency-mark ${escapeHtml(row.priority)}"></i><div><strong>${escapeHtml(row.location_name)}</strong><span>${escapeHtml(row.mission)}</span></div><time>${formatDate(row.operation_start_at)}</time></article>`).join("") : `<div class="empty-state"><strong>ไม่มีงานค้าง</strong><span>ทุกภารกิจเสร็จสิ้นแล้ว</span></div>`;
}

function renderRequestTable() {
  const query = $("#search-input").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  const filtered = requestRows.filter(row => (status === "all" || row.overall_status === status) && (!query || [row.request_no,row.location_name,row.organization,row.mission,row.assigned_team_name,row.assigned_center_name].some(value => String(value||"").toLowerCase().includes(query))));
  $("#result-summary").textContent = `แสดง ${filtered.length.toLocaleString("th-TH")} จาก ${requestRows.length.toLocaleString("th-TH")} รายการ`;
  $("#empty-state").hidden = Boolean(filtered.length);
  $("#request-table-body").innerHTML = filtered.map(row => {
    const percent = Math.round((Number(row.completed_steps||0)/8)*100);
    const statusInfo = STATUS[row.overall_status] || STATUS.pending;
    return `<tr><td><strong>${escapeHtml(row.request_no)}</strong><span class="cell-sub">รับเมื่อ ${formatDate(row.received_at)}</span></td><td><strong>${escapeHtml(row.location_name)}</strong><span class="cell-sub">${escapeHtml(row.mission)}</span></td><td>${escapeHtml(row.assigned_team_name||"ยังไม่มอบหมาย")}</td><td>${formatDate(row.operation_start_at)}</td><td><strong>${Number(row.personnel_required||0).toLocaleString("th-TH")} คน</strong><span class="cell-sub">${escapeHtml(PRIORITY[row.priority]||"ปกติ")}</span></td><td class="progress-cell"><span class="progress-label">${escapeHtml(row.current_step||"รับคำร้อง")} · ${percent}%</span><div class="mini-progress"><i style="width:${percent}%"></i></div></td><td><span class="status-chip ${statusInfo[1]}">${statusInfo[0]}</span></td></tr>`;
  }).join("");
}

function requestPayload(form) {
  const payload = Object.fromEntries(new FormData(form));
  payload.received_at = payload.received_at ? new Date(payload.received_at).toISOString() : new Date().toISOString();
  payload.received_by = "ระบบรับคำร้องออนไลน์";
  const latitude = payload.operation_latitude;
  const longitude = payload.operation_longitude;
  if (latitude && longitude) {
    const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
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
  const existingCenters = centralState?.centers || [
    {id:"c1",center_code:"SUB-01",name:"ศูนย์ผินแจ่มวิชาสอน",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
    {id:"c2",center_code:"SUB-02",name:'ศูนย์พัฒนาบุคลากรทางการลูกเสือ ยุวกาชาดและกิจกรรมเยาวชน "กฐิน กุยยกานนท์"',service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
    {id:"c3",center_code:"SUB-03",name:"มัธยมวัดหนองจอก",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true},
    {id:"c4",center_code:"SUB-04",name:"วิทยาลัยเทคนิคดอนเมือง",service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`,active:true}
  ];
  const existingTeams = centralState?.teams?.length ? centralState.teams : [{
    id:"t1",team_no:"TEAM-20260928-0001",team_type:"relief_packing",leader_name:demoVolunteers[0].full_name,
    operation_area:"กรุงเทพมหานครและปริมณฑล",operation_start_at:new Date(now+86400000).toISOString(),
    operation_end_at:new Date(now+118800000).toISOString(),member_count:3,
    members:demoVolunteers.slice(0,3).map((volunteer,index)=>({volunteer_id:volunteer.id,full_name:volunteer.full_name,role:index===0?"หัวหน้าชุด":"สมาชิก",is_leader:index===0}))
  }];
  return {label:`${CENTRAL_NAME} (โหมดตัวอย่าง)`,volunteers:demoVolunteers,teams:existingTeams,centers:existingCenters,requests:[...demoRows,...[...demoManage.values()].map(item=>item.request)].map(request => ({
    ...request,
    assigned_center_id:request.id==="d1"?"c1":null,
    assigned_center_name:request.id==="d1"?existingCenters[0].name:null,
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
  loading.textContent = targetName === "dispatch" ? "กำลังโหลดข้อมูลคำร้องและชุดปฏิบัติการ…" : `กำลังโหลดข้อมูล${CENTRAL_NAME}…`;
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
    $("#dispatch-subtitle").textContent = `${CENTRAL_NAME} · ตรวจสอบคำร้องและเลือกชุดปฏิบัติการที่เหมาะสม`;
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
  const teams = centralState.teams || [];
  const unassigned = requests.filter(request => !request.assigned_team_id).length;
  $("#center-kpis").innerHTML = [
    ["กำลังในทะเบียน",volunteers.length,"คน"],
    ["ชุดปฏิบัติการ",teams.length,"ชุด"]
  ].map(([label,value,unit],index) => `<article class="kpi-card ${index===0?"kpi-accent":""}"><span>${label}</span><strong>${Number(value).toLocaleString("th-TH")}</strong><small>${unit}</small></article>`).join("");
  $("#dispatch-kpis").innerHTML = [
    ["ชุดปฏิบัติการ",teams.length,"ชุด"],
    ["คำร้องทั้งหมด",requests.length,"รายการ"],
    ["คำร้องรอมอบหมาย",unassigned,"รายการ"]
  ].map(([label,value,unit],index) => `<article class="kpi-card ${index===0?"kpi-accent":""}"><span>${label}</span><strong>${Number(value).toLocaleString("th-TH")}</strong><small>${unit}</small></article>`).join("");
  renderCentralVolunteers();
  renderMemberPicker();
  renderTeams();
  renderDispatchTeams();
  renderAssignments();
}

function filteredCentralVolunteers() {
  const query = $("#volunteer-search").value.trim().toLowerCase();
  const group = $("#volunteer-group-filter").value;
  return (centralState?.volunteers||[]).filter(item => (group === "all" || Number(item.group_no) === Number(group)) && (!query || [item.registration_no,item.full_name,item.organization_network,item.operational_areas,item.skills].some(value => String(value||"").toLowerCase().includes(query))));
}

function renderCentralVolunteers() {
  $("#volunteer-table-body").innerHTML = filteredCentralVolunteers().map(item => `<tr><td><strong>${escapeHtml(item.registration_no)}</strong><span class="cell-sub">${escapeHtml(item.scoutdd_id||"ไม่มี ScoutDD ID")}</span><span class="cell-private">เลขประจำตัว ${escapeHtml(item.national_id)}</span></td><td><strong>${escapeHtml(item.full_name)}</strong><span class="cell-sub">${escapeHtml(item.organization_network)}</span><span class="cell-private">${escapeHtml(item.phone)}</span></td><td><span class="group-chip">กลุ่ม ${Number(item.group_no)}</span><span class="cell-sub">${escapeHtml(GROUPS[Number(item.group_no)-1]||"")}</span></td><td><strong>${escapeHtml(item.operational_areas)}</strong><span class="cell-sub">${escapeHtml(item.skills)}</span></td><td>${escapeHtml([item.vehicle,item.equipment].filter(Boolean).join(" · ")||"–")}</td><td><span class="status-chip ${item.active?"completed":"blocked"}">${item.active?"พร้อมจัดกำลัง":"ไม่พร้อม"}</span><span class="cell-sub">${escapeHtml(item.availability_details)}</span></td></tr>`).join("");
}

function renderMemberPicker() {
  const volunteers = (centralState?.volunteers||[]).filter(item => item.active);
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
      const leader = (centralState.volunteers||[]).find(item => item.id===payload.leader_volunteer_id);
      centralState.teams.unshift({id:crypto.randomUUID(),team_no:`TEAM-${String(centralState.teams.length+1).padStart(4,"0")}`,team_type:payload.team_type,leader_name:leader?.full_name||"",operation_area:payload.operation_area,operation_start_at:payload.operation_start_at,operation_end_at:payload.operation_end_at,member_count:members.length,members:members.map(member=>({...member,full_name:(centralState.volunteers||[]).find(item=>item.id===member.volunteer_id)?.full_name||""}))});
    }
    showToast("บันทึกชุดปฏิบัติการแล้ว");
    form.reset();
    form.elements.operation_start_at.value = toLocalInput(new Date(Date.now()+86400000));
    if (online) await loadCentral(); else renderCentral();
  } catch (error) {
    showToast("สร้างชุดไม่สำเร็จ: " + (error.message || error), true);
  } finally { button.disabled = false; }
}

function renderTeams() {
  const teams = centralState?.teams || [];
  $("#team-list").innerHTML = teams.length ? `<h3 class="subheading">ชุดปฏิบัติการที่จัดแล้ว</h3>` + teams.map(team => {
    const type = TEAM_TYPES[team.team_type] || [team.team_type||"ชุดปฏิบัติการ","",""];
    const members = Array.isArray(team.members) ? team.members : [];
    return `<article class="team-card"><div><span class="team-no">${escapeHtml(team.team_no)}</span><h3>${escapeHtml(type[0])}</h3><p>${escapeHtml(team.operation_area)} · ${formatDate(team.operation_start_at)}</p></div><div class="team-meta"><span>หัวหน้าชุด<strong>${escapeHtml(team.leader_name||"–")}</strong></span><span>สมาชิก<strong>${Number(team.member_count??members.length).toLocaleString("th-TH")} คน</strong></span></div>${members.length?`<details><summary>ดูรายชื่อสมาชิก</summary><ul>${members.map(member=>`<li>${escapeHtml(member.full_name||"")} ${member.role?`· ${escapeHtml(member.role)}`:""}</li>`).join("")}</ul></details>`:""}</article>`;
  }).join("") : `<div class="empty-state compact-empty"><strong>ยังไม่ได้จัดชุดปฏิบัติการ</strong><span>เลือกหัวหน้าชุดและสมาชิกจากทะเบียนด้านบน</span></div>`;
}

function teamDisplayName(team) {
  const type = TEAM_TYPES[team?.team_type] || [team?.team_type || "ชุดปฏิบัติการ"];
  return [team?.team_no,type[0]].filter(Boolean).join(" · ");
}

function renderDispatchTeams() {
  const teams = centralState?.teams || [];
  $("#dispatch-team-list").innerHTML = teams.length ? teams.map(team => `<article class="subcenter-card"><div><span>${escapeHtml(team.team_no)}</span><strong>${escapeHtml((TEAM_TYPES[team.team_type]||[team.team_type||"ชุดปฏิบัติการ"])[0])}</strong><small>${escapeHtml(team.operation_area||"ยังไม่ระบุพื้นที่")} · ${formatDate(team.operation_start_at)}</small></div><div><span class="status-chip completed">พร้อมรับภารกิจ</span><small>หัวหน้าชุด ${escapeHtml(team.leader_name||"–")} · ${Number(team.member_count||0).toLocaleString("th-TH")} คน</small></div></article>`).join("") : `<div class="empty-state compact-empty"><strong>ยังไม่มีชุดปฏิบัติการ</strong><span>ไปที่เมนูศูนย์ควบคุมและจัดชุดปฏิบัติการเพื่อสร้างชุดก่อนส่งต่อคำร้อง</span></div>`;
}

function renderAssignments() {
  const requests = centralState?.requests || [];
  const teams = centralState?.teams || [];
  $("#assignment-list").innerHTML = requests.length ? requests.map(request => {
    const selected = request.assigned_team_id || "";
    const assignedTeam = teams.find(team => team.id===selected);
    const currentLabel = assignedTeam ? teamDisplayName(assignedTeam) : [request.assigned_team_no,(TEAM_TYPES[request.assigned_team_type]||[request.assigned_team_type])[0]].filter(Boolean).join(" · ");
    return `<article class="assignment-card" data-request-id="${request.id}"><div class="assignment-main"><span class="team-no">${escapeHtml(request.request_no)}</span><h3>${escapeHtml(request.location_name)}</h3><p>${escapeHtml(request.mission)}</p><small>${Number(request.personnel_required||0).toLocaleString("th-TH")} คน · ${formatDate(request.operation_start_at)} · ผู้ประสานงาน ${escapeHtml(request.coordinator_name||"–")} ${escapeHtml(request.coordinator_phone||"")}</small><button class="request-detail-link view-request-detail" type="button">ดูรายละเอียดทั้งหมดและแผนที่ →</button></div><div class="assignment-control"><select class="assignment-team" ${teams.length?"":"disabled"}><option value="">เลือกชุดปฏิบัติการ</option>${teams.map(team=>`<option value="${team.id}" ${selected===team.id?"selected":""}>${escapeHtml(teamDisplayName(team))} · ${escapeHtml(team.leader_name||"ไม่ระบุหัวหน้าชุด")}</option>`).join("")}</select><input class="assignment-note" placeholder="ข้อสั่งการ / หมายเหตุ" value="${escapeHtml(request.assignment_note||"")}"><button class="button button-primary assign-request" type="button" ${teams.length?"":"disabled"}>${selected?"เปลี่ยนชุดปฏิบัติการ":"ส่งต่อชุดปฏิบัติการ"}</button>${selected?`<small>ปัจจุบัน: ${escapeHtml(currentLabel||"ชุดปฏิบัติการที่เลือก")} · หัวหน้าชุด ${escapeHtml(request.assigned_team_leader||assignedTeam?.leader_name||"–")}</small>`:""}</div></article>`;
  }).join("") : `<div class="empty-state"><strong>ยังไม่มีคำร้อง</strong><span>คำร้องใหม่จากหน้าสาธารณะจะแสดงที่นี่</span></div>`;
}

async function assignRequest(button) {
  const card = button.closest(".assignment-card");
  const teamId = $(".assignment-team",card).value;
  const note = $(".assignment-note",card).value;
  if (!teamId) { showToast("กรุณาเลือกชุดปฏิบัติการ", true); return; }
  button.disabled = true;
  try {
    if (online) {
      const {error} = await supabase.rpc("assign_request_to_team_by_session", {p_session_token:authSession.session_token,p_request_id:card.dataset.requestId,p_team_id:teamId,p_note:note});
      if (error) throw error;
      await loadCentral();
    } else {
      const request = centralState.requests.find(item => item.id===card.dataset.requestId);
      const team = centralState.teams.find(item => item.id===teamId);
      Object.assign(request,{assigned_team_id:teamId,assigned_team_no:team.team_no,assigned_team_type:team.team_type,assigned_team_leader:team.leader_name,assigned_team_name:teamDisplayName(team),assignment_note:note});
      const publicRequest = demoRows.find(item => item.id===request.id) || demoManage.get(request.id)?.public;
      if (publicRequest) publicRequest.assigned_team_name = teamDisplayName(team);
      renderCentral();
    }
    showToast("ส่งต่อคำร้องให้ชุดปฏิบัติการแล้ว");
  } catch (error) {
    showToast("ส่งต่อคำร้องไม่สำเร็จ: " + (error.message || error), true);
  } finally { button.disabled = false; }
}

async function loadSubcenter() {
  $("#subcenter-content").hidden = true;
  $("#subcenter-loading").hidden = false;
  $("#subcenter-loading").textContent = "กำลังโหลดคำร้องที่ได้รับมอบหมาย…";
  if (!authSession || authSession.role !== "subcenter") { location.hash="login"; return; }
  try {
    let data;
    if (online) {
      const result = await supabase.rpc("get_subcenter_workspace_by_session", {p_session_token:authSession.session_token});
      if (result.error) throw result.error;
      data = result.data;
    } else {
      const source = centralState || demoCentralWorkspace();
      const center = (source.centers||[]).find(item => item.id===authSession.center_id) || {id:authSession.center_id,name:authSession.center_name,service_areas:`พื้นที่รับผิดชอบตามที่${CENTRAL_NAME}มอบหมาย`};
      const assigned = (source.requests||[]).filter(item => item.assigned_center_id===authSession.center_id).map(request => ({request,steps:demoManage.get(request.id)?.steps||STEP_CATALOG.map(([code,name,detail],index)=>({step_code:code,step_order:index+1,step_name:name,step_detail:detail,status:index===0?"completed":"pending",assignee:"",note:""}))}));
      data = {center,requests:assigned};
    }
    if (!data) throw new Error("บัญชีไม่มีสิทธิ์หรือศูนย์นี้ถูกปิดใช้งาน");
    subcenterSession = {data};
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
  const records = subcenterSession?.data?.requests || [];
  $("#subcenter-request-list").innerHTML = records.length ? records.map((record,index) => {
    const request = record.request;
    const steps = record.steps || [];
    return `<details class="subcenter-request" ${index===0?"open":""} data-request-id="${request.id}"><summary><div><span class="team-no">${escapeHtml(request.request_no)}</span><strong>${escapeHtml(request.location_name)}</strong><small>${escapeHtml(request.mission)}</small></div><span class="status-chip ${escapeHtml(request.overall_status||"pending")}">${escapeHtml((STATUS[request.overall_status]||STATUS.pending)[0])}</span></summary><div class="request-private-grid"><span>ผู้ประสานงาน<strong>${escapeHtml(request.coordinator_name||"–")}</strong><small>${escapeHtml(request.coordinator_org||"")} · ${escapeHtml(request.coordinator_phone||"")}</small></span><span>วันปฏิบัติงาน<strong>${formatDate(request.operation_start_at)}</strong><small>${Number(request.personnel_required||0).toLocaleString("th-TH")} คน</small></span><span>สถานการณ์<strong>${escapeHtml(request.situation||"–")}</strong><small>${escapeHtml(request.impact||"")}</small></span></div><button class="button button-ghost view-request-detail subcenter-detail-button" type="button">ดูข้อมูลคำร้องทั้งหมดและพิกัดแผนที่</button><div class="step-editor sub-step-editor">${steps.sort((a,b)=>a.step_order-b.step_order).map(step=>stepEditorHtml(step,"sub")).join("")}</div><form class="sub-summary-form summary-editor-inline"><label><span>สรุปผลการดำเนินงาน / ข้อสั่งการเพิ่มเติม</span><textarea name="summary" rows="3">${escapeHtml(request.summary||"")}</textarea></label><div class="form-grid cols-2"><label><span>ผู้บันทึก</span><input name="recorder_name" value="${escapeHtml(request.recorder_name||"")}"></label><label><span>ตำแหน่ง</span><input name="recorder_position" value="${escapeHtml(request.recorder_position||"")}"></label></div><div class="align-end"><button class="button button-primary" type="submit">บันทึกสรุปผล</button></div></form></div></details>`;
  }).join("") : `<div class="panel empty-state"><strong>ยังไม่มีคำร้องที่ได้รับมอบหมาย</strong><span>เมื่อ${CENTRAL_NAME}ส่งต่อคำร้อง รายการจะแสดงที่หน้านี้</span></div>`;
}

function requestLocation(request) {
  const raw = String(request.operation_point || "");
  const coordinateMatch = raw.match(/พิกัด:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  const latitude = Number(request.operation_latitude ?? coordinateMatch?.[1]);
  const longitude = Number(request.operation_longitude ?? coordinateMatch?.[2]);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const description = raw.split(/\s*\|\s*พิกัด:/i)[0].trim() || "ไม่ได้ระบุรายละเอียดจุดปฏิบัติงาน";
  return {description,hasCoordinates,latitude,longitude,mapUrl:hasCoordinates?`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`:""};
}

function detailItem(label,value,full=false) {
  return `<div class="request-detail-item ${full?"full":""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "–")}</dd></div>`;
}

function openRequestDetails(request) {
  if (!request) return;
  const dialog = $("#request-detail-dialog");
  const location = requestLocation(request);
  const status = STATUS[request.overall_status] || STATUS.pending;
  $("#request-detail-no").textContent = request.request_no || "คำร้อง";
  $("#request-detail-title").textContent = request.location_name || "รายละเอียดคำร้อง";
  $("#request-detail-subtitle").textContent = `${PRIORITY[request.priority] || "ปกติ"} · ${status[0]}`;
  $("#request-detail-content").innerHTML = `
    <section class="request-detail-section"><h3>ข้อมูลผู้แจ้งและการรับเรื่อง</h3><dl class="request-detail-grid">${detailItem("ประเภทผู้แจ้ง",request.requester_type === "agency" ? "หน่วยงาน" : "ประชาชน")}${detailItem("ชื่อผู้แจ้ง / หน่วยงาน",request.requester_name)}${detailItem("วันและเวลารับคำขอ",formatDate(request.received_at))}${detailItem("ช่องทางรับเรื่อง",request.received_by)}</dl></section>
    <section class="request-detail-section"><h3>สถานที่และความต้องการ</h3><dl class="request-detail-grid">${detailItem("ชื่อสถานที่",request.location_name)}${detailItem("หน่วยงาน / สถานศึกษา",request.organization)}${detailItem("จุดปฏิบัติงาน",location.description,true)}${detailItem("สถานการณ์ปัจจุบัน",request.situation,true)}${detailItem("ผลกระทบ",request.impact,true)}${detailItem("ภารกิจหรือความช่วยเหลือที่ต้องการ",request.mission,true)}</dl></section>
    <section class="request-detail-section"><h3>กำหนดการและการประสานงาน</h3><dl class="request-detail-grid">${detailItem("กำลังพลที่ต้องการ",`${Number(request.personnel_required||0).toLocaleString("th-TH")} คน`)}${detailItem("ระดับความเร่งด่วน",PRIORITY[request.priority] || "ปกติ")}${detailItem("เริ่มปฏิบัติงาน",formatDate(request.operation_start_at))}${detailItem("สิ้นสุดโดยประมาณ",request.operation_end_at ? formatDate(request.operation_end_at) : "ไม่ได้ระบุ")}${detailItem("ชื่อผู้ประสานงาน",request.coordinator_name)}${detailItem("หน่วยงานผู้ประสานงาน",request.coordinator_org)}${detailItem("หมายเลขโทรศัพท์",request.coordinator_phone)}${detailItem("ชุดปฏิบัติการที่รับผิดชอบ",request.assigned_team_name || [request.assigned_team_no,(TEAM_TYPES[request.assigned_team_type]||[request.assigned_team_type])[0]].filter(Boolean).join(" · ") || "ยังไม่มอบหมาย")}${detailItem("หัวหน้าชุด",request.assigned_team_leader || "ยังไม่ระบุ")}${detailItem("ข้อสั่งการ / หมายเหตุการมอบหมาย",request.assignment_note || "ยังไม่มี",true)}</dl></section>`;
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
  if (routeInfo().name === "subcenter") return subcenterSession?.data?.requests?.find(record => record.request?.id === requestId)?.request;
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
  Promise.resolve(context.registerTool({name:"create_service_request",title:"สร้างคำร้องช่วยเหลือ",description:"สร้างคำร้องใหม่จากข้อมูลที่ครบถ้วนและคืนเลขที่คำร้อง",inputSchema:{type:"object",properties:{requester_type:{type:"string",enum:["citizen","agency"]},requester_name:{type:"string"},received_by:{type:"string"},location_name:{type:"string"},situation:{type:"string"},mission:{type:"string"},personnel_required:{type:"integer",minimum:1},operation_start_at:{type:"string"},coordinator_name:{type:"string"},coordinator_org:{type:"string"},coordinator_phone:{type:"string"},priority:{type:"string",enum:["normal","urgent","critical"]}},required:["requester_name","received_by","location_name","situation","mission","personnel_required","operation_start_at","coordinator_name","coordinator_org","coordinator_phone"],additionalProperties:true},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){const result=await createRequest({...input,requester_type:input.requester_type||"citizen",received_at:new Date().toISOString()});return{request_no:result.request_no}}},{signal:lifecycle.signal})).catch(()=>{});
}

$("#volunteer-form").addEventListener("submit",handleVolunteerSubmit);
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
$("#search-input").addEventListener("input",renderRequestTable);
$("#status-filter").addEventListener("change",renderRequestTable);
$("#volunteer-search").addEventListener("input",renderCentralVolunteers);
$("#volunteer-group-filter").addEventListener("change",renderCentralVolunteers);
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
$("#assignment-list").addEventListener("click",event => { const detailButton=event.target.closest(".view-request-detail"); if (detailButton) { openRequestDetails(requestFromDetailButton(detailButton)); return; } const button=event.target.closest(".assign-request"); if (button) assignRequest(button); });
$("#subcenter-request-list").addEventListener("click",event => { const detailButton=event.target.closest(".view-request-detail"); if (detailButton) { openRequestDetails(requestFromDetailButton(detailButton)); return; } const button=event.target.closest(".save-sub-step"); if (button) saveSubcenterStep(button); });
$("#subcenter-request-list").addEventListener("submit",event => { const form=event.target.closest(".sub-summary-form"); if (form) { event.preventDefault(); saveSubcenterSummary(form); } });
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
