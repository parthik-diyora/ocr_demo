import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#155e75",
      dark: "#164e63",
      light: "#cffafe"
    },
    secondary: {
      main: "#7c3aed",
      dark: "#5b21b6",
      light: "#ede9fe"
    },
    background: {
      default: "#f4f6f7",
      paper: "#ffffff"
    },
    success: {
      main: "#2e7d32"
    },
    warning: {
      main: "#ed6c02"
    }
  },
  shape: {
    borderRadius: 6
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h5: { fontWeight: 700, letterSpacing: 0 },
    h6: { fontWeight: 700, letterSpacing: 0 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true }
    },
    MuiTextField: {
      defaultProps: { size: "small" }
    },
    MuiFormControl: {
      defaultProps: { size: "small" }
    }
  }
});

