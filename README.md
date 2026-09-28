# ระบบประสานงานลูกเสือช่วยเหลือ

เว็บประสานงาน 2 ระบบที่ใช้ฐานข้อมูล PostgreSQL เดียวกัน โดยหน้าประชาชนเป็นสาธารณะและหน้าปฏิบัติงานของเจ้าหน้าที่ต้องเข้าสู่ระบบ

## ระบบ 1 ทะเบียนกำลังและจัดชุดปฏิบัติการ

- เปิดรับลงทะเบียนกำลังและทรัพยากร 6 กลุ่มตามแบบฟอร์มที่ 1
- ผู้ลงทะเบียนเลือกศูนย์ย่อย 1 ใน 4 แห่งที่ต้องการเข้าร่วม
- ศูนย์ย่อยเป็นผู้เลือกหัวหน้าชุด สมาชิก พื้นที่ และช่วงเวลาปฏิบัติงานของตนเอง
- ศูนย์อำนวยการเห็นภาพรวมทะเบียนและชุดปฏิบัติการทุกศูนย์ พร้อมแก้ไข/ลบข้อมูลทะเบียน
- เก็บ ScoutDD ID เลขประจำตัวประชาชน หน่วยงาน เบอร์โทร พื้นที่ ทักษะ ยานพาหนะ อุปกรณ์ และช่วงเวลาที่พร้อม
- ตรวจ Check Digit ของเลขประจำตัวประชาชนไทย 13 หลัก และรับเบอร์โทรศัพท์เฉพาะตัวเลข 9–10 หลัก
- ศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อค้นหาทะเบียน ดูภาพรวม และส่งต่อภารกิจให้ศูนย์ย่อย ส่วนศูนย์ย่อยเลือกชุดปฏิบัติการของตนเอง
- รองรับชุดปฏิบัติการ 4 ประเภท ได้แก่ สิ่งของช่วยเหลือ ศูนย์พักพิง พื้นที่ปลอดภัยสำหรับเด็ก และฟื้นฟูสถานศึกษา

## ระบบ 2 รับคำร้องและมอบหมายศูนย์ย่อยและชุดปฏิบัติการ

- ประชาชนหรือหน่วยงานส่งคำร้องโดยไม่ต้อง Login
- ช่องหน่วยงาน/สถานศึกษาและหน่วยงานผู้ประสานงานเป็นข้อมูลไม่บังคับ สำหรับผู้แจ้งที่ไม่มีสังกัด
- ศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อตรวจสอบรายละเอียดและพิกัด แล้วเลือกศูนย์ย่อยผู้รับผิดชอบ
- ศูนย์ย่อยเห็นคำร้องในบัญชีของตน เลือกชุดปฏิบัติการที่จัดไว้ในระบบ 1 และติดตามรายละเอียดชุด พื้นที่ หัวหน้าชุด และรายชื่อสมาชิก เพื่ออัปเดต 8 ขั้นตอนตามแบบฟอร์มที่ 3 ส่วนที่ 2
- Dashboard สาธารณะอัปเดตแบบ real time และไม่แสดงข้อมูลส่วนบุคคล

## สิทธิ์การใช้งาน

- หน้าลงทะเบียนและหน้าส่งคำร้องเป็นสาธารณะ
- ศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อ 1 บัญชี เห็นทะเบียนกำลังและชุดทุกศูนย์ ตรวจคำร้อง และเลือกศูนย์ย่อยผู้รับผิดชอบ
- ศูนย์ย่อย 4 บัญชี เห็นเฉพาะคำร้องที่ศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อมอบหมายให้หน่วยของตน
- ศูนย์ย่อยมีเมนูข้อมูลผู้พักพิงสำหรับบันทึก/แก้ไขชื่อ ที่อยู่ เบอร์โทร จำนวนผู้เข้าพักร่วม และผู้ติดต่อฉุกเฉิน โดยเห็นเฉพาะรายการของศูนย์ตัวเอง ข้อมูลนี้ไม่ขึ้น Dashboard สาธารณะ
- เซสชันเจ้าหน้าที่มีอายุ 24 ชั่วโมง และฐานข้อมูลเก็บเฉพาะ hash ของรหัสผ่านและ session token
- ตารางข้อมูลจริงเปิด RLS และไม่อนุญาตให้ anonymous อ่านโดยตรง

## ติดตั้งฐานข้อมูล

1. สำหรับฐานข้อมูลใหม่ ให้รัน `supabase/schema.sql`
2. รัน `supabase/migration-002-two-systems.sql`
3. รัน `supabase/migration-003-staff-login.sql`
4. รัน `supabase/migration-004-team-assignment.sql`
5. รัน `supabase/migration-005-center-team-dispatch.sql`
6. รัน `supabase/migration-006-subcenter-team-management.sql`
7. รัน `supabase/migration-007-subcenter-team-dispatch.sql`
8. รัน `supabase/migration-008-thai-id-and-phone-validation.sql`
9. รัน `supabase/migration-009-allow-editing-legacy-volunteers.sql`
10. รัน `supabase/migration-010-shelter-residents.sql`
11. รัน `supabase/migration-011-optional-request-organization.sql`
12. สร้างบัญชีเริ่มต้นหนึ่งครั้งจาก SQL Editor:

```sql
select * from public.provision_initial_staff_accounts();
```

คำสั่งจะคืนชื่อผู้ใช้และรหัสผ่านสุ่มของศูนย์อำนวยการลูกเสือช่วยเหลือผู้อื่นทุกเมื่อ 1 บัญชี กับศูนย์ย่อย 4 บัญชี ควรบันทึกรหัสผ่านไว้ในที่ปลอดภัย เพราะระบบจะไม่แสดงรหัสเดิมอีก

ชื่อผู้ใช้เริ่มต้นคือ `central`, `phinjam`, `kathin`, `nongchok` และ `donmueang`

## Deploy ด้วย GitHub Pages

Repository variables ที่ workflow ใช้:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

เมื่อ push เข้า branch `main` ระบบจะสร้าง `config.js` และ deploy หน้าเว็บอัตโนมัติ

## รันเองด้วย Docker + PostgreSQL (ไม่ใช้ Supabase)

โหมดนี้อยู่ใน repo เดียวกัน แต่ใช้ PostgreSQL และ API บนเซิร์ฟเวอร์ของคุณเอง เว็บ GitHub Pages เดิมยังใช้ Supabase ตามเดิมจนกว่าจะตัดสินใจย้ายผู้ใช้ไป URL ใหม่ ห้ามนำ `.env` หรือ `.env.migration` ขึ้น Git เพราะมีรหัสฐานข้อมูลและข้อมูลเชื่อมต่อต้นทาง

### เริ่มฐานข้อมูลและเตรียมแอป

บนเซิร์ฟเวอร์ Linux ที่ติดตั้ง Docker Engine และ Docker Compose plugin แล้ว:

```bash
git clone https://github.com/panupongp-create/luk-suea-help-dashboard.git
cd luk-suea-help-dashboard
cp .env.example .env
# แก้ POSTGRES_PASSWORD และ APP_DB_PASSWORD ให้เป็นรหัสสุ่มที่ต่างกัน
# HTTP_PORT=80 คือพอร์ตบนเครื่องเซิร์ฟเวอร์ที่ส่งเข้า Nginx ใน Docker
docker compose build
docker compose up -d db
docker compose run --rm migrate
```

ฐานข้อมูล PostgreSQL อยู่ใน Docker volume `postgres_data` และไม่ได้เปิดพอร์ต 5432 ออกสู่สาธารณะ แอปใช้บัญชีฐานข้อมูล `app_api` ซึ่งเรียกได้เฉพาะฟังก์ชันที่หน้าเว็บต้องใช้และอ่านตาราง Dashboard ที่ตัดข้อมูลส่วนบุคคลแล้ว Nginx ใน Docker เป็น reverse proxy ไปยัง `app:3000`; ไฟล์ตั้งค่าเริ่มต้นคือ `nginx/default.conf` เปิดพอร์ต 80 เพื่อทดสอบเท่านั้น

### โดเมนและ HTTPS

ที่ผู้ใช้แจ้งคือ IP `203.159.242.200` และชื่อ `www.AGER_DD-01.moe.go.th` การตั้ง DNS **ไม่ได้เกิดจาก Nginx หรือ Docker**: ผู้ดูแล DNS ของ `moe.go.th` ต้องสร้าง A record ของชื่อที่ใช้จริงให้ชี้มายัง IP นี้ และเปิดพอร์ต 80/443 ที่ไฟร์วอลล์ หากเครื่องมีบริการอื่นใช้พอร์ต 80 อยู่ ให้แก้ `HTTP_PORT` ใน `.env` หรือวางระบบหลัง reverse proxy ที่มีอยู่

ชื่อ `www.AGER_DD-01.moe.go.th` มี `_` ซึ่งไม่ใช่อักขระที่ใช้ใน hostname สำหรับใบรับรอง HTTPS สาธารณะ จึงไม่ควรใช้กับระบบที่มีการล็อกอินและข้อมูลส่วนบุคคล ให้ผู้ดูแลโดเมนยืนยันชื่อที่ไม่มี `_` ก่อน (เช่น `www.AGER-DD-01.moe.go.th` *ถ้ามีสิทธิ์ตั้งชื่อนี้จริง*) แล้วจึงจัดเตรียมใบรับรอง TLS ที่ตรงกับชื่อนั้น HTTP ในไฟล์เริ่มต้นใช้ทดสอบการเชื่อมต่อเท่านั้น ไม่ใช่การเปิดใช้จริง

เมื่อมีชื่อที่ถูกต้องและใบรับรองแล้ว ใช้ตัวเลือก HTTPS ของ Nginx ใน repo:

```bash
cp nginx/https.conf.example nginx/https.conf
# แก้ example.org ใน nginx/https.conf เป็นชื่อโดเมนจริงที่ตรงกับใบรับรอง
# วาง fullchain.pem และ privkey.pem ที่ออกให้ชื่อนั้นใน certs/ (ไม่ขึ้น Git)
docker compose -f compose.yaml -f compose.https.yaml config --quiet
docker compose -f compose.yaml -f compose.https.yaml up -d web
```

ตรวจจากเครื่องภายนอกด้วย `https://<ชื่อโดเมนจริง>/healthz` และทดสอบหน้าเข้าสู่ระบบ การต่ออายุใบรับรองและการ reload Nginx เป็นหน้าที่ผู้ดูแลเซิร์ฟเวอร์; ไฟล์ `certs/` และ `nginx/https.conf` ถูก Git ignore ไว้

#### ทดสอบ Nginx กับโดเมน `AGER_DD-01.moe.go.th` ที่ได้รับมา

ถ้าใบรับรองสองไฟล์อยู่บนเซิร์ฟเวอร์ที่ `/home/eduadmin/ssl/all_certificate.crt` และ `/home/eduadmin/ssl/privatekey.key` แล้ว สามารถทดสอบว่า Nginx เปิดพอร์ต 443 และส่งต่อถึงแอปได้โดยไม่คัดลอก private key เข้า repo ไฟล์ตัวอย่างนี้ **ไม่ redirect HTTP** และ **ไม่ใช่การเปิด HTTPS สำหรับใช้งานจริง**: OpenSSL ไม่ยอมรับชื่อที่มี `_` กับใบรับรอง `*.moe.go.th` ดังนั้นบางไคลเอนต์จะขึ้น certificate hostname mismatch

```bash
# บนเซิร์ฟเวอร์ ในโฟลเดอร์ repo
# แก้ TLS_CERT_DIR ใน .env จาก ./certs เป็น /home/eduadmin/ssl
cp nginx/https-underscore-diagnostic.conf.example nginx/https.conf
sudo docker compose -f compose.yaml -f compose.https.yaml config --quiet
sudo docker compose -f compose.yaml -f compose.https.yaml up -d web
sudo docker compose -f compose.yaml -f compose.https.yaml exec web nginx -t
```

ทดสอบ `https://AGER_DD-01.moe.go.th/healthz` จากเครื่องภายนอกโดย **ไม่** กดข้ามคำเตือนใบรับรอง ถ้าไคลเอนต์ไม่ยอมรับใบรับรอง ให้หยุดที่จุดนี้และให้ผู้ดูแลโดเมนเพิ่มชื่อที่ถูกต้อง เช่น `AGER-DD-01.moe.go.th` ก่อนใช้กับคำร้องหรือบัญชีเจ้าหน้าที่ ใบรับรอง wildcard ที่มีอยู่ครอบคลุมชื่อใหม่ระดับเดียวนี้หาก DNS ถูกสร้างจริง

### คัดลอกข้อมูลจริงจาก Supabase เดิม

ข้อมูลต้นทางต้องใช้ PostgreSQL connection string ที่มีสิทธิ์อ่านตาราง `public` ทั้งหมด รวมถึงข้อมูลส่วนบุคคล บัญชีเจ้าหน้าที่แบบ hash, คำร้อง, ขั้นตอน, การมอบหมาย, ชุดปฏิบัติการ และผู้พักพิง ดู connection string ที่ Project Dashboard → Connect; ถ้าลืม database password ให้จัดการใน Database Settings ของโปรเจกต์เอง [วิธีเลือกการเชื่อมต่อของ Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) หากเซิร์ฟเวอร์เข้า direct connection (IPv6) ไม่ได้ ให้ใช้ Session pooler ที่รองรับ IPv4 และคง SSL ไว้

```bash
cp .env.migration.example .env.migration
# ใส่ SOURCE_DATABASE_URL จริงในไฟล์ .env.migration; ไม่ใส่รหัสในคำสั่งหรือ Git
chmod 600 .env .env.migration
docker compose -f compose.yaml -f compose.migration.yaml run --rm migrate node server/copy-data.mjs
```

สคริปต์อ่านต้นทางใน transaction แบบ snapshot และคัดลอกเฉพาะข้อมูลแอปใน `public` ไปยังฐานใหม่ที่ว่าง ตรวจสคีมาและจำนวนแถวทุกตาราง แล้ว commit พร้อมกัน หากมีตารางต้นทางเพิ่มเติมหรือฐานปลายทางมีข้อมูลอยู่ สคริปต์จะหยุดโดยไม่เขียนทับ เมื่อคัดลอกสำเร็จจึงเปิดเว็บใหม่:

```bash
docker compose up -d app web
docker compose ps
curl -f http://localhost/healthz
```

การคัดลอกเป็นภาพข้อมูล ณ เวลาที่รัน เว็บ GitHub Pages เดิมยังรับข้อมูลต่อได้ ดังนั้นข้อมูลใหม่หลังเวลานั้นจะไม่ปรากฏบนเซิร์ฟเวอร์ใหม่โดยอัตโนมัติ ก่อนเปลี่ยน URL ให้ผู้ใช้จริง ต้องหยุดการเขียนที่ระบบเดิมชั่วคราวและคัดลอกข้อมูลรอบสุดท้ายลงฐานปลายทางที่ว่างหรือมีแผนรวมข้อมูล หลีกเลี่ยงการให้ทั้งสองเว็บรับข้อมูลจริงพร้อมกัน เพราะฐานข้อมูลจะไม่ซิงก์กัน

หากเคยคัดลอกไปแล้วและต้องการภาพข้อมูลล่าสุด ให้หยุดเว็บใหม่ สำรองฐานใหม่ก่อน แล้วรันด้วย `--replace` คำสั่งนี้แทนข้อมูลแอปทั้งหมดในฐานปลายทางภายใน transaction เดียว หากขั้นตอนใดผิดพลาดจะ rollback ข้อมูลเดิม ห้ามใช้เมื่อมีข้อมูลใหม่ที่บันทึกเฉพาะบนเว็บใหม่:

```bash
docker compose stop web app
docker compose exec -T db sh -c 'exec pg_dump -U postgres -d luk_suea -Fc' > before-final-copy.dump
docker compose -f compose.yaml -f compose.migration.yaml run --rm -e ALLOW_TARGET_REPLACE=YES migrate node server/copy-data.mjs --replace
docker compose up -d app web
```

### สำรองข้อมูลและอัปเดตโค้ด

สำรอง volume PostgreSQL เป็นประจำ และเก็บไฟล์สำรองนอกเซิร์ฟเวอร์ ก่อนอัปเดตแอป:

```bash
git pull
docker compose build
docker compose up -d
```

Migration ของสคีมาจะรันเฉพาะไฟล์ที่ยังไม่เคยใช้ ส่วนข้อมูลส่วนตัวไม่ได้ถูกใส่ลง image หรือ repo
