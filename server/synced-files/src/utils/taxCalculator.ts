export interface TaxResult {
  taxAmount: number;
  taxRate: number;
  breakdown: TaxBreakdown[];
  netIncome: number;
}

export interface TaxBreakdown {
  bracket: string;
  taxableAmount: number;
  rate: number;
  tax: number;
}

export function calculateThaiTax(annualIncome: number): TaxResult {
  if (annualIncome <= 0) {
    return {
      taxAmount: 0,
      taxRate: 0,
      breakdown: [],
      netIncome: annualIncome
    };
  }

  const breakdown: TaxBreakdown[] = [];
  let totalTax = 0;
  let maxTaxRate = 0;

  // ขั้นบันไดภาษีในประเทศไทย (ปี 2567)
  const taxBrackets = [
    { min: 0, max: 150000, rate: 0 },
    { min: 150000, max: 300000, rate: 5 },
    { min: 300000, max: 500000, rate: 10 },
    { min: 500000, max: 750000, rate: 15 },
    { min: 750000, max: 1000000, rate: 20 },
    { min: 1000000, max: 2000000, rate: 25 },
    { min: 2000000, max: 5000000, rate: 30 },
    { min: 5000000, max: Infinity, rate: 35 }
  ];

  // คำนวณภาษีตามขั้นบันได
  let remainingIncome = annualIncome;
  let cumulativeTax = 0;

  for (let i = 0; i < taxBrackets.length; i++) {
    const bracket = taxBrackets[i];
    
    if (remainingIncome > bracket.min) {
      const taxableInThisBracket = Math.min(remainingIncome - bracket.min, bracket.max - bracket.min);
      const taxInThisBracket = (taxableInThisBracket * bracket.rate) / 100;
      
      if (taxInThisBracket > 0) {
        breakdown.push({
          bracket: `${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
          taxableAmount: taxableInThisBracket,
          rate: bracket.rate,
          tax: taxInThisBracket
        });
        cumulativeTax += taxInThisBracket;
        maxTaxRate = Math.max(maxTaxRate, bracket.rate);
      }
    }
  }

  totalTax = cumulativeTax;

  return {
    taxAmount: Math.round(totalTax),
    taxRate: maxTaxRate,
    breakdown,
    netIncome: annualIncome - totalTax
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('th-TH').format(amount);
}
