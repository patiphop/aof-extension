import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import TaxCalculator from './components/TaxCalculator';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      'Kanit',
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TaxCalculator />
    </ThemeProvider>
  );
}

export default App;
