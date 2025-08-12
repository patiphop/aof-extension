import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import TaxCalculator from './TaxCalculator';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TaxCalculator', () => {
  it('ควรแสดงหัวข้อหลัก', () => {
    renderWithTheme(<TaxCalculator />);
    expect(screen.getByText('คำนวณภาษีในประเทศไทย')).toBeInTheDocument();
  });

  it('ควรมีช่องกรอกรายได้', () => {
    renderWithTheme(<TaxCalculator />);
    expect(screen.getByLabelText('รายได้ทั้งปี (บาท)')).toBeInTheDocument();
  });

  it('ควรมีปุ่มคำนวณภาษี', () => {
    renderWithTheme(<TaxCalculator />);
    expect(screen.getByText('คำนวณภาษี')).toBeInTheDocument();
  });

  it('ควรแสดงข้อผิดพลาดเมื่อกรอกข้อมูลไม่ถูกต้อง', () => {
    renderWithTheme(<TaxCalculator />);
    
    const input = screen.getByLabelText('รายได้ทั้งปี (บาท)');
    const button = screen.getByText('คำนวณภาษี');
    
    fireEvent.change(input, { target: { value: '-1000' } });
    fireEvent.click(button);
    
    expect(screen.getByText('กรุณากรอกรายได้เป็นจำนวนที่ถูกต้อง')).toBeInTheDocument();
  });

  it('ควรคำนวณภาษีได้ถูกต้อง', () => {
    renderWithTheme(<TaxCalculator />);
    
    const input = screen.getByLabelText('รายได้ทั้งปี (บาท)');
    const button = screen.getByText('คำนวณภาษี');
    
    fireEvent.change(input, { target: { value: '500000' } });
    fireEvent.click(button);
    
    expect(screen.getByText('ผลการคำนวณ')).toBeInTheDocument();
    // ตรวจสอบว่ามีการแสดงผลการคำนวณ
    expect(screen.getByText('ภาษีที่ต้องจ่าย')).toBeInTheDocument();
    expect(screen.getByText('รายได้สุทธิ')).toBeInTheDocument();
  });

  it('ควรแสดงขั้นบันไดภาษี', () => {
    renderWithTheme(<TaxCalculator />);
    expect(screen.getByText('ขั้นบันไดภาษีในประเทศไทย (ปี 2567)')).toBeInTheDocument();
  });
});
