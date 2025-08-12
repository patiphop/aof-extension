import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import { Calculate, TrendingUp, AccountBalance } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { calculateThaiTax, formatCurrency, formatNumber } from '../utils/taxCalculator';

const TaxCalculator: React.FC = () => {
  const [annualIncome, setAnnualIncome] = useState<string>('');
  const [taxResult, setTaxResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleCalculate = () => {
    const income = parseFloat(annualIncome);
    
    if (isNaN(income) || income < 0) {
      setError('กรุณากรอกรายได้เป็นจำนวนที่ถูกต้อง');
      setTaxResult(null);
      return;
    }

    setError('');
    const result = calculateThaiTax(income);
    setTaxResult(result);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCalculate();
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          <AccountBalance sx={{ mr: 2, color: 'primary.main' }} />
          คำนวณภาษีในประเทศไทย
        </Typography>
      </motion.div>

      <Grid container spacing={4}>
        {/* Input Section */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <Calculate sx={{ mr: 1, color: 'primary.main' }} />
                  กรอกข้อมูลรายได้
                </Typography>
                
                <TextField
                  fullWidth
                  label="รายได้ทั้งปี (บาท)"
                  variant="outlined"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="เช่น 500000"
                  sx={{ mb: 2 }}
                  inputProps={{
                    style: { fontSize: '1.2rem' }
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCalculate}
                  disabled={!annualIncome}
                  sx={{ py: 1.5 }}
                >
                  <Calculate sx={{ mr: 1 }} />
                  คำนวณภาษี
                </Button>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Result Section */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {taxResult && (
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                    ผลการคำนวณ
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            ภาษีที่ต้องจ่าย
                          </Typography>
                          <Typography variant="h4" color="error" fontWeight="bold">
                            {formatCurrency(taxResult.taxAmount)}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6" color="primary">
                            รายได้สุทธิ
                          </Typography>
                          <Typography variant="h4" color="success.main" fontWeight="bold">
                            {formatCurrency(taxResult.netIncome)}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      สรุปข้อมูล
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body1">
                          รายได้ทั้งปี: <strong>{formatCurrency(parseFloat(annualIncome))}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body1">
                          อัตราภาษีสูงสุด: <Chip label={`${taxResult.taxRate}%`} color="primary" size="small" />
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    รายละเอียดการคำนวณ
                  </Typography>
                  
                  <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ขั้นบันไดภาษี</TableCell>
                          <TableCell align="right">จำนวนเงิน (บาท)</TableCell>
                          <TableCell align="center">อัตรา (%)</TableCell>
                          <TableCell align="right">ภาษี (บาท)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {taxResult.breakdown.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.bracket}</TableCell>
                            <TableCell align="right">{formatNumber(item.taxableAmount)}</TableCell>
                            <TableCell align="center">
                              <Chip label={`${item.rate}%`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">{formatNumber(Math.round(item.tax))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </Grid>
      </Grid>

      {/* Tax Brackets Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card elevation={2} sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ขั้นบันไดภาษีในประเทศไทย (ปี 2567)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>รายได้สุทธิ (บาท)</TableCell>
                    <TableCell align="center">อัตราภาษี (%)</TableCell>
                    <TableCell>หมายเหตุ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>0 - 150,000</TableCell>
                    <TableCell align="center">0</TableCell>
                    <TableCell>ไม่ต้องเสียภาษี</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>150,001 - 300,000</TableCell>
                    <TableCell align="center">5</TableCell>
                    <TableCell>เสียภาษี 5% ของส่วนเกิน 150,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>300,001 - 500,000</TableCell>
                    <TableCell align="center">10</TableCell>
                    <TableCell>เสียภาษี 10% ของส่วนเกิน 300,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>500,001 - 750,000</TableCell>
                    <TableCell align="center">15</TableCell>
                    <TableCell>เสียภาษี 15% ของส่วนเกิน 500,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>750,001 - 1,000,000</TableCell>
                    <TableCell align="center">20</TableCell>
                    <TableCell>เสียภาษี 20% ของส่วนเกิน 750,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1,000,001 - 2,000,000</TableCell>
                    <TableCell align="center">25</TableCell>
                    <TableCell>เสียภาษี 25% ของส่วนเกิน 1,000,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2,000,001 - 5,000,000</TableCell>
                    <TableCell align="center">30</TableCell>
                    <TableCell>เสียภาษี 30% ของส่วนเกิน 2,000,000 บาท</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>5,000,001 ขึ้นไป</TableCell>
                    <TableCell align="center">35</TableCell>
                    <TableCell>เสียภาษี 35% ของส่วนเกิน 5,000,000 บาท</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default TaxCalculator;
