# คำนวณภาษีในประเทศไทย 🇹🇭

โปรแกรมคำนวณภาษีในประเทศไทยที่สร้างด้วย React + TypeScript + Vite พร้อม UI ที่สวยงามและใช้งานง่าย

## ✨ คุณสมบัติ

- 🧮 คำนวณภาษีตามขั้นบันไดภาษีไทย (ปี 2567)
- 📊 แสดงรายละเอียดการคำนวณแบบแยกขั้นบันได
- 💰 แสดงผลภาษีที่ต้องจ่ายและรายได้สุทธิ
- 🎨 UI ที่สวยงามด้วย Material-UI
- 📱 Responsive design รองรับทุกอุปกรณ์
- ⚡ เร็วและใช้งานง่าย
- 🧪 มีการทดสอบครอบคลุม

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนด
- Node.js 18+ 
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

1. Clone โปรเจค
```bash
git clone <repository-url>
cd debug-extension
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. รันโปรแกรมในโหมด development
```bash
npm run dev
```

4. เปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

### คำสั่งอื่นๆ

```bash
# รันเทสต์
npm test

# รันเทสต์แบบ watch mode
npm run test:watch

# Build สำหรับ production
npm run build

# Preview build
npm run preview
```

## �� ขั้นบันไดภาษีในประเทศไทย (ปี 2567)

| รายได้สุทธิ (บาท) | อัตราภาษี (%) | หมายเหตุ |
|------------------|---------------|----------|
| 0 - 150,000 | 0 | ไม่ต้องเสียภาษี |
| 150,001 - 300,000 | 5 | เสียภาษี 5% ของส่วนเกิน 150,000 บาท |
| 300,001 - 500,000 | 10 | เสียภาษี 10% ของส่วนเกิน 300,000 บาท |
| 500,001 - 750,000 | 15 | เสียภาษี 15% ของส่วนเกิน 500,000 บาท |
| 750,001 - 1,000,000 | 20 | เสียภาษี 20% ของส่วนเกิน 750,000 บาท |
| 1,000,001 - 2,000,000 | 25 | เสียภาษี 25% ของส่วนเกิน 1,000,000 บาท |
| 2,000,001 - 5,000,000 | 30 | เสียภาษี 30% ของส่วนเกิน 2,000,000 บาท |
| 5,000,001 ขึ้นไป | 35 | เสียภาษี 35% ของส่วนเกิน 5,000,000 บาท |

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material-UI (MUI)
- **Animation**: Framer Motion
- **Testing**: Vitest + React Testing Library
- **Form Handling**: React Hook Form
- **Charts**: Recharts
- **Date/Time**: date-fns, moment
- **HTTP Client**: Axios
- **State Management**: React Query

## 📁 โครงสร้างโปรเจค

```
src/
├── components/
│   ├── TaxCalculator.tsx      # Component หลักสำหรับคำนวณภาษี
│   └── TaxCalculator.test.tsx # เทสต์สำหรับ component
├── utils/
│   ├── taxCalculator.ts       # ฟังก์ชันคำนวณภาษี
│   └── taxCalculator.test.ts  # เทสต์สำหรับฟังก์ชัน
├── test/
│   └── setup.ts              # การตั้งค่าสำหรับ testing
├── App.tsx                   # Component หลัก
└── main.tsx                  # Entry point
```

## 🧪 การทดสอบ

โปรเจคนี้ใช้ TDD (Test-Driven Development) ในการพัฒนา

```bash
# รันเทสต์ทั้งหมด
npm test

# รันเทสต์แบบ watch mode
npm run test:watch

# รันเทสต์ UI
npm run test:ui
```

### ตัวอย่างการทดสอบ

```typescript
// ทดสอบการคำนวณภาษี
describe('calculateThaiTax', () => {
  it('ควรคำนวณภาษี 0% สำหรับรายได้ต่ำกว่า 150,000 บาท', () => {
    const result = calculateThaiTax(100000);
    expect(result.taxAmount).toBe(0);
    expect(result.taxRate).toBe(0);
  });
});
```

## 📊 ตัวอย่างการใช้งาน

1. กรอกรายได้ทั้งปีในช่อง "รายได้ทั้งปี (บาท)"
2. กดปุ่ม "คำนวณภาษี" หรือกด Enter
3. ดูผลการคำนวณ:
   - ภาษีที่ต้องจ่าย
   - รายได้สุทธิ
   - รายละเอียดการคำนวณแบบแยกขั้นบันได

## 🤝 การมีส่วนร่วม

1. Fork โปรเจค
2. สร้าง feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

## 📝 License

MIT License - ดูรายละเอียดใน [LICENSE](LICENSE) file

## 📞 ติดต่อ

หากมีคำถามหรือข้อเสนอแนะ กรุณาเปิด issue ใน GitHub repository

---

**หมายเหตุ**: โปรแกรมนี้เป็นเพียงเครื่องมือช่วยคำนวณภาษีเบื้องต้น กรุณาตรวจสอบกับกรมสรรพากรหรือผู้เชี่ยวชาญด้านภาษีเพื่อความถูกต้องในการยื่นภาษีจริง
