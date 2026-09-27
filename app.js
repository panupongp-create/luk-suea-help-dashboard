import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.APP_CONFIG || {};
const online = Boolean(config.SUPABASE_URL && config.SUPABASE_PUBLISHABLE_KEY);
const supabase = online ? createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY) : null;

const STEP_CATALOG = [
  ["received", "รับคำร้อง", "รับและบันทึกข้อมูลคำร้องขอให้ครบถ้วน"],
  ["verified", "ตรวจสอบ", "ตรวจสอบข้อมูลและยืนยันกับผู้ประสานงาน"],
  ["safety", "ประเมินความปลอดภัย", "ประเมินความเสี่ยงของพื้นที่และภารกิจ"],
  ["team_type", "กำหนดประเภททีม", "กำหนดชุดปฏิบัติการให้ตรงกับภารกิจ"],
  ["staffing", "จัดกำลัง", "จัดจำนวนผู้ปฏิบัติงานตามภารกิจและช่วงเวลา"],
  ["leader_notified", "แจ้งหัวหน้าทีม", "แจ้งสถานที่ ภารกิจ วันเวลา และข้อควรระวัง"],
  ["operating", "เข้าปฏิบัติ", "ชุดปฏิบัติการเข้าพื้นที่ตามภารกิจ"],
  ["reported", "รายงานผล", "รายงานผล ปัญหา อุปสรรค และความต้องการเพิ่มเติม"]
];

const STATUS = {
  pending: ["รอดำเนินการ", "pending"],
  in_progress: ["กำลังดำเนินการ", "in_progress"],
  blocked: ["ติดปัญหา", "blocked"],
  completed: ["เสร็จสิ้น", "completed"]
};
const PRIORITY = { normal: "ปกติ", urgent: "เร่งด่วน", critical: "ฉุกเฉิน" };

const demoRows = [
  {id:"d1",request_no:"REQ-20260927-00004",received_at:new Date().toISOString(),location_name:"โรงเรียนบ้านหนองน้ำใส",organization:"สำนักงานเขตพื้นที่การศึกษา",mission:"สนับสนุนการจัดพื้นที่และขนย้ายสิ่งของ",personnel_required:12,operation_start_at:new Date(Date.now()+86400000).toISOString(),priority:"urgent",overall_status:"in_progress",current_step:"จัดกำลัง",completed_steps:4},
  {id:"d2",request_no:"REQ-20260927-00003",received_at:new Date(Date.now()-7200000).toISOString(),location_name:"ชุมชนริมคลอง",organization:"เทศบาลตำบล",mission:"ช่วยจัดระเบียบพื้นที่และประสานจุดรับบริจาค",personnel_required:18,operation_start_at:new Date(Date.now()+18000000).toISOString(),priority:"critical",overall_status:"blocked",current_step:"ประเมินความปลอดภัย",completed_steps:2},
  {id:"d3",request_no:"REQ-20260926-00002",received_at:new Date(Date.now()-86400000).toISOString(),location_name:"ศูนย์พักพิงชั่วคราว",organization:"องค์การบริหารส่วนตำบล",mission:"จัดชุดช่วยงานครัวและกระจายสิ่งของ",personnel_required:20,operation_start_at:new Date(Date.now()+172800000).toISOString(),priority:"normal",overall_status:"pending",current_step:"ตรวจสอบ",completed_steps:1},
  {id:"d4",request_no:"REQ-20260925-00001",received_at:new Date(Date.now()-172800000).toISOString(),location_name:"วัดกลาง",organization:"เครือข่ายจิตอาสา",mission:"ทำความสะอาดและฟื้นฟูพื้นที่",personnel_required:25,operation_start_at:new Date(Date.now()-86400000).toISOString(),priority:"normal",overall_status:"completed",current_step:"รายงานผล",completed_steps:8}
];

let rows = [];
let demoCounter = demoRows.length + 1;
const demoManage = new Map();
let realtimeChannel = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const formatDate = value => value ? new Intl.DateTimeFormat("th-TH", {dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "–";
const toLocalInput = date => { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };

function showToast(message, error = false) {
  const el = $("#toast"); el.textContent = message; el.style.background = error ? "#9d3131" : "#0b2f47"; el.hidden = false;
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.hidden = true, 3400);
}

function setConnectionState(state) {
  const badge = $(".live-badge");
  badge.classList.toggle("connected", state === "connected");
  $("#live-label").textContent = state === "connected" ? "ข้อมูลสด" : online ? "กำลังเชื่อมต่อ" : "ข้อมูลตัวอย่าง";
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "dashboard";
  const name = hash.startsWith("manage/") ? "manage" : hash;
  $$(".view").forEach(v => v.hidden = v.id !== `${name}-view`);
  $$(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.route === name));
  if (name === "dashboard") loadDashboard();
  if (name === "new") setFormDefaults();
  if (name === "manage") loadManage(hash);
  window.scrollTo({top:0,behavior:"smooth"});
}

function setFormDefaults() {
  const form = $("#request-form");
  if (!form.elements.received_at.value) form.elements.received_at.value = toLocalInput(new Date());
  if (!form.elements.operation_start_at.value) form.elements.operation_start_at.value = toLocalInput(new Date(Date.now() + 86400000));
}

async function loadDashboard() {
  setConnectionState(online ? "connecting" : "demo");
  if (online) {
    const { data, error } = await supabase.from("public_requests").select("*").order("received_at", {ascending:false}).limit(500);
    if (error) { showToast("โหลด Dashboard ไม่สำเร็จ: " + error.message, true); return; }
    rows = data || [];
    setConnectionState("connected");
  } else {
    rows = [...demoRows, ...[...demoManage.values()].map(x => x.public)];
  }
  renderDashboard();
}

function renderDashboard() {
  const total = rows.length;
  $("#kpi-total").textContent = total.toLocaleString("th-TH");
  $("#kpi-active").textContent = rows.filter(r => r.overall_status === "in_progress" || r.overall_status === "pending").length.toLocaleString("th-TH");
  $("#kpi-blocked").textContent = rows.filter(r => r.overall_status === "blocked").length.toLocaleString("th-TH");
  $("#kpi-done").textContent = rows.filter(r => r.overall_status === "completed").length.toLocaleString("th-TH");
  $("#kpi-people").textContent = rows.reduce((n,r)=>n+Number(r.personnel_required||0),0).toLocaleString("th-TH");
  renderStatusChart(); renderUrgentList(); renderTable();
}

function renderStatusChart() {
  const root = $("#status-chart");
  root.innerHTML = Object.keys(STATUS).map(key => {
    const count = rows.filter(r => r.overall_status === key).length;
    const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;
    return `<div class="bar-row"><span>${STATUS[key][0]}</span><div class="bar-track"><div class="bar-fill ${key}" style="width:${pct}%"></div></div><strong>${count}</strong></div>`;
  }).join("");
}

function renderUrgentList() {
  const ordered = rows.filter(r => r.overall_status !== "completed").sort((a,b) => {
    const rank = {critical:0,urgent:1,normal:2}; return (rank[a.priority] - rank[b.priority]) || new Date(a.operation_start_at) - new Date(b.operation_start_at);
  }).slice(0,4);
  $("#urgent-list").innerHTML = ordered.length ? ordered.map(r => `<article class="urgent-item"><i class="urgency-mark ${escapeHtml(r.priority)}"></i><div><strong>${escapeHtml(r.location_name)}</strong><span>${escapeHtml(r.mission)}</span></div><time>${formatDate(r.operation_start_at)}</time></article>`).join("") : `<div class="empty-state"><strong>ไม่มีงานค้าง</strong><span>ทุกภารกิจเสร็จสิ้นแล้ว</span></div>`;
}

function renderTable() {
  const q = $("#search-input").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  const filtered = rows.filter(r => (status === "all" || r.overall_status === status) && (!q || [r.request_no,r.location_name,r.organization,r.mission].some(v => String(v||"").toLowerCase().includes(q))));
  $("#result-summary").textContent = `แสดง ${filtered.length.toLocaleString("th-TH")} จาก ${rows.length.toLocaleString("th-TH")} รายการ`;
  $("#empty-state").hidden = Boolean(filtered.length);
  $("#request-table-body").innerHTML = filtered.map(r => {
    const pct = Math.round((Number(r.completed_steps||0) / 8) * 100);
    const statusInfo = STATUS[r.overall_status] || STATUS.pending;
    return `<tr><td><strong>${escapeHtml(r.request_no)}</strong><span class="cell-sub">รับเมื่อ ${formatDate(r.received_at)}</span></td><td><strong>${escapeHtml(r.location_name)}</strong><span class="cell-sub">${escapeHtml(r.mission)}</span></td><td>${formatDate(r.operation_start_at)}</td><td><strong>${Number(r.personnel_required||0).toLocaleString("th-TH")} คน</strong><span class="cell-sub">${escapeHtml(PRIORITY[r.priority]||"ปกติ")}</span></td><td class="progress-cell"><span class="progress-label">${escapeHtml(r.current_step||"รับคำร้อง")} · ${pct}%</span><div class="mini-progress"><i style="width:${pct}%"></i></div></td><td><span class="status-chip ${statusInfo[1]}">${statusInfo[0]}</span></td></tr>`;
  }).join("");
}

function formPayload(form) {
  const fd = new FormData(form); const payload = Object.fromEntries(fd.entries());
  payload.personnel_required = Number(payload.personnel_required);
  ["received_at","operation_start_at","operation_end_at"].forEach(k => payload[k] = payload[k] ? new Date(payload[k]).toISOString() : null);
  return payload;
}

async function createRequest(payload) {
  if (online) {
    const { data, error } = await supabase.rpc("create_public_request", {p_payload:payload});
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }
  const id = crypto.randomUUID(); const token = crypto.randomUUID().replaceAll("-","");
  const number = `REQ-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(demoCounter++).padStart(5,"0")}`;
  const steps = STEP_CATALOG.map(([code,name,detail],i)=>({step_code:code,step_order:i+1,step_name:name,step_detail:detail,status:i===0?"completed":"pending",assignee:"",note:"",action_at:i===0?new Date().toISOString():null}));
  const publicRow = {...payload,id,request_no:number,overall_status:"in_progress",current_step:"ตรวจสอบ",completed_steps:1};
  demoManage.set(id,{token,request:{...payload,id,request_no:number,summary:"",recorder_name:"",recorder_position:""},steps,public:publicRow});
  return {request_id:id,request_no:number,edit_token:token};
}

async function handleSubmit(event) {
  event.preventDefault();
  const button = $("#submit-button"); button.disabled = true; button.textContent = "กำลังบันทึก…";
  try {
    const result = await createRequest(formPayload(event.currentTarget));
    const manageLink = `${location.origin}${location.pathname}#manage/${result.request_id}/${result.edit_token}`;
    $("#success-request-no").textContent = result.request_no;
    $("#success-manage-link").value = manageLink;
    $("#go-manage").dataset.link = manageLink;
    $("#success-dialog").showModal();
    event.currentTarget.reset(); setFormDefaults();
  } catch (error) { showToast("บันทึกไม่สำเร็จ: " + (error.message || error), true); }
  finally { button.disabled = false; button.textContent = "บันทึกคำร้อง"; }
}

async function loadManage(hash) {
  const [,requestId,token] = hash.split("/");
  $("#manage-content").hidden = true; $("#manage-loading").hidden = false;
  if (!requestId || !token) { $("#manage-loading").textContent = "ลิงก์จัดการไม่ครบถ้วน"; return; }
  try {
    let record;
    if (online) {
      const {data,error} = await supabase.rpc("get_request_by_token", {p_request_id:requestId,p_edit_token:token});
      if (error) throw error; record = data;
    } else {
      record = demoManage.get(requestId); if (!record || record.token !== token) throw new Error("ไม่พบข้อมูลในโหมดตัวอย่าง");
    }
    if (!record) throw new Error("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    renderManage(record, requestId, token);
    $("#manage-loading").hidden = true; $("#manage-content").hidden = false;
  } catch(error) { $("#manage-loading").textContent = "เปิดคำร้องไม่ได้: " + (error.message || error); }
}

function renderManage(record, requestId, token) {
  const req = record.request || record; const steps = record.steps || [];
  $("#manage-title").textContent = req.request_no;
  $("#manage-subtitle").textContent = `${req.location_name} · ${req.mission}`;
  $("#manage-summary").innerHTML = `<div class="summary-tile"><span>สถานที่และภารกิจ</span><strong>${escapeHtml(req.location_name)}</strong><small>${escapeHtml(req.mission)}</small></div><div class="summary-tile"><span>วันปฏิบัติงาน</span><strong>${formatDate(req.operation_start_at)}</strong></div><div class="summary-tile"><span>กำลังพลที่ต้องการ</span><strong>${Number(req.personnel_required).toLocaleString("th-TH")} คน</strong></div>`;
  $("#step-editor").innerHTML = steps.sort((a,b)=>a.step_order-b.step_order).map(s => `<div class="step-row" data-code="${escapeHtml(s.step_code)}"><span class="step-no">${s.step_order}</span><div class="step-name"><strong>${escapeHtml(s.step_name)}</strong><span>${escapeHtml(s.step_detail)}</span></div><input class="step-assignee" value="${escapeHtml(s.assignee||"")}" placeholder="ผู้รับผิดชอบ" aria-label="ผู้รับผิดชอบ ${escapeHtml(s.step_name)}"><select class="step-status" aria-label="สถานะ ${escapeHtml(s.step_name)}">${Object.entries(STATUS).map(([v,x])=>`<option value="${v}" ${s.status===v?"selected":""}>${x[0]}</option>`).join("")}</select><input class="step-note" value="${escapeHtml(s.note||"")}" placeholder="ผล / หมายเหตุ" aria-label="หมายเหตุ ${escapeHtml(s.step_name)}"><button class="button button-ghost save-step" type="button">บันทึก</button></div>`).join("");
  const sf = $("#summary-form"); sf.elements.summary.value = req.summary || ""; sf.elements.recorder_name.value = req.recorder_name || ""; sf.elements.recorder_position.value = req.recorder_position || "";
  $("#manage-content").dataset.requestId = requestId; $("#manage-content").dataset.token = token;
}

async function saveStep(button) {
  const row = button.closest(".step-row"); const {requestId,token} = $("#manage-content").dataset;
  const payload = {requestId,token,stepCode:row.dataset.code,status:$(".step-status",row).value,assignee:$(".step-assignee",row).value,note:$(".step-note",row).value};
  button.disabled=true; button.textContent="กำลังบันทึก";
  try {
    if (online) {
      const {error}=await supabase.rpc("update_workflow_step_by_token",{p_request_id:payload.requestId,p_edit_token:payload.token,p_step_code:payload.stepCode,p_status:payload.status,p_assignee:payload.assignee,p_note:payload.note}); if(error) throw error;
    } else {
      const rec=demoManage.get(requestId); const step=rec.steps.find(s=>s.step_code===payload.stepCode); Object.assign(step,{status:payload.status,assignee:payload.assignee,note:payload.note,action_at:new Date().toISOString()}); const done=rec.steps.filter(s=>s.status==="completed").length; rec.public.completed_steps=done; rec.public.overall_status=rec.steps.some(s=>s.status==="blocked")?"blocked":done===8?"completed":"in_progress"; rec.public.current_step=(rec.steps.find(s=>s.status!=="completed")||rec.steps[7]).step_name;
    }
    showToast("บันทึกขั้นตอนแล้ว");
  } catch(error){showToast("บันทึกไม่สำเร็จ: "+(error.message||error),true)} finally{button.disabled=false;button.textContent="บันทึก"}
}

async function saveSummary(event) {
  event.preventDefault(); const {requestId,token}=$("#manage-content").dataset; const data=Object.fromEntries(new FormData(event.currentTarget));
  try {
    if(online){const {error}=await supabase.rpc("update_request_summary_by_token",{p_request_id:requestId,p_edit_token:token,p_summary:data.summary,p_recorder_name:data.recorder_name,p_recorder_position:data.recorder_position});if(error)throw error}
    else Object.assign(demoManage.get(requestId).request,data);
    showToast("บันทึกสรุปผลแล้ว");
  }catch(error){showToast("บันทึกไม่สำเร็จ: "+(error.message||error),true)}
}

function registerWebMcpTools() {
  const context = document.modelContext; if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  Promise.resolve(context.registerTool({name:"create_service_request",title:"สร้างคำร้องช่วยเหลือ",description:"สร้างคำร้องใหม่จากข้อมูลที่ครบถ้วนและคืนเลขที่คำร้องพร้อมลิงก์จัดการ",inputSchema:{type:"object",properties:{received_by:{type:"string"},location_name:{type:"string"},situation:{type:"string"},mission:{type:"string"},personnel_required:{type:"integer",minimum:1},operation_start_at:{type:"string"},coordinator_name:{type:"string"},coordinator_org:{type:"string"},coordinator_phone:{type:"string"},priority:{type:"string",enum:["normal","urgent","critical"]}},required:["received_by","location_name","situation","mission","personnel_required","operation_start_at","coordinator_name","coordinator_org","coordinator_phone"],additionalProperties:true},annotations:{readOnlyHint:false,untrustedContentHint:false},async execute(input){const result=await createRequest({...input,received_at:new Date().toISOString()});await loadDashboard();return{request_no:result.request_no,manage_hash:`#manage/${result.request_id}/${result.edit_token}`}}},{signal:lifecycle.signal})).catch(()=>{});
}

function subscribeRealtime() {
  if(!online) return;
  realtimeChannel=supabase.channel("public-dashboard").on("postgres_changes",{event:"*",schema:"public",table:"public_requests"},()=>loadDashboard()).subscribe(status=>{if(status==="SUBSCRIBED")setConnectionState("connected")});
}

$("#request-form").addEventListener("submit",handleSubmit);
$("#search-input").addEventListener("input",renderTable);
$("#status-filter").addEventListener("change",renderTable);
$("#step-editor").addEventListener("click",e=>{const b=e.target.closest(".save-step");if(b)saveStep(b)});
$("#summary-form").addEventListener("submit",saveSummary);
$("#copy-manage-link").addEventListener("click",async()=>{await navigator.clipboard.writeText($("#success-manage-link").value);showToast("คัดลอกลิงก์แล้ว")});
$("#go-dashboard").addEventListener("click",()=>{$("#success-dialog").close();location.hash="dashboard"});
$("#go-manage").addEventListener("click",e=>{$("#success-dialog").close();location.href=e.currentTarget.dataset.link});
window.addEventListener("hashchange",route);
window.addEventListener("beforeunload",()=>{if(realtimeChannel)supabase.removeChannel(realtimeChannel)});
$("#connection-banner").hidden=online;
setFormDefaults();subscribeRealtime();registerWebMcpTools();route();
