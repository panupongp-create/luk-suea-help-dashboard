# ระบบรับคำร้องและ Dashboard ลูกเสือช่วยเหลือ

เว็บแบบไม่ต้องเข้าสู่ระบบสำหรับบันทึกคำร้อง ติดตามกระบวนการ 8 ขั้นตอน และแสดง Dashboard แบบ real time

## คุณสมบัติ

- แบบฟอร์มรับคำร้องตามเอกสารต้นฉบับ
- สร้างเลขที่คำร้องและขั้นตอนดำเนินงานอัตโนมัติ
- ลิงก์จัดการเฉพาะคำร้องโดยไม่ต้อง Login
- Dashboard real time พร้อมค้นหาและตัวกรอง
- ปิดบังข้อมูลผู้ประสานงานจาก Dashboard สาธารณะ
- Responsive สำหรับคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์
- Deploy อัตโนมัติด้วย GitHub Pages

## เชื่อม Supabase

1. สร้าง Supabase project
2. เปิด SQL Editor และรัน `supabase/schema.sql`
3. ใน GitHub repository ไปที่ Settings → Secrets and variables → Actions → Variables
4. เพิ่ม Repository variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. เปิด Settings → Pages และเลือก Source เป็น GitHub Actions
6. รัน workflow `Deploy GitHub Pages` หรือ push เข้า branch `main`

หากยังไม่ใส่ค่าการเชื่อมต่อ เว็บจะแสดงข้อมูลตัวอย่างและขึ้นแถบ “โหมดตัวอย่าง” โดยไม่เก็บข้อมูลถาวร

## ความปลอดภัย

ตารางข้อมูลจริงไม่เปิดให้ผู้ใช้ทั่วไปอ่าน แก้ไข หรือลบโดยตรง Dashboard อ่านจากตารางสาธารณะที่ไม่มีชื่อและเบอร์โทร ผู้สร้างคำร้องจะได้รับลิงก์จัดการที่มี token แบบสุ่ม ควรส่งลิงก์นี้เฉพาะเจ้าหน้าที่ที่รับผิดชอบ
