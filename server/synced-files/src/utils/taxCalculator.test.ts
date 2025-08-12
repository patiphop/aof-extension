import { describe, it, expect } from 'vitest';
import { calculateThaiTax } from './taxCalculator';

describe('calculateThaiTax', () => {
  it('ควรคำนวณภาษี 0% สำหรับรายได้ต่ำกว่า 150,000 บาท', () => {
    const result = calculateThaiTax(100000);
    expect(result.taxAmount).toBe(0);
    expect(result.taxRate).toBe(0);
  });

  it('ควรคำนวณภาษี 5% สำหรับรายได้ 150,000 - 300,000 บาท', () => {
    const result = calculateThaiTax(200000);
    expect(result.taxAmount).toBe(2500); // (200,000 - 150,000) * 0.05
    expect(result.taxRate).toBe(5);
  });

  it('ควรคำนวณภาษี 10% สำหรับรายได้ 300,000 - 500,000 บาท', () => {
    const result = calculateThaiTax(400000);
    expect(result.taxAmount).toBe(17500); // 7,500 + (400,000 - 300,000) * 0.10
    expect(result.taxRate).toBe(10);
  });

  it('ควรคำนวณภาษี 15% สำหรับรายได้ 500,000 - 750,000 บาท', () => {
    const result = calculateThaiTax(600000);
    expect(result.taxAmount).toBe(42500); // 7,500 + 20,000 + 15,000
    expect(result.taxRate).toBe(15);
  });

  it('ควรคำนวณภาษี 20% สำหรับรายได้ 750,000 - 1,000,000 บาท', () => {
    const result = calculateThaiTax(800000);
    expect(result.taxAmount).toBe(75000); // 7,500 + 20,000 + 37,500 + 10,000
    expect(result.taxRate).toBe(20);
  });

  it('ควรคำนวณภาษี 25% สำหรับรายได้ 1,000,000 - 2,000,000 บาท', () => {
    const result = calculateThaiTax(1500000);
    expect(result.taxAmount).toBe(240000); // 7,500 + 20,000 + 37,500 + 50,000 + 125,000
    expect(result.taxRate).toBe(25);
  });

  it('ควรคำนวณภาษี 30% สำหรับรายได้ 2,000,000 - 5,000,000 บาท', () => {
    const result = calculateThaiTax(3000000);
    expect(result.taxAmount).toBe(665000); // 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 300,000
    expect(result.taxRate).toBe(30);
  });

  it('ควรคำนวณภาษี 35% สำหรับรายได้มากกว่า 5,000,000 บาท', () => {
    const result = calculateThaiTax(6000000);
    expect(result.taxAmount).toBe(1615000); // 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 + 350,000
    expect(result.taxRate).toBe(35);
  });

  it('ควรจัดการกับรายได้ที่เป็น 0', () => {
    const result = calculateThaiTax(0);
    expect(result.taxAmount).toBe(0);
    expect(result.taxRate).toBe(0);
  });

  it('ควรจัดการกับรายได้ที่เป็นจำนวนลบ', () => {
    const result = calculateThaiTax(-100000);
    expect(result.taxAmount).toBe(0);
    expect(result.taxRate).toBe(0);
  });
});
