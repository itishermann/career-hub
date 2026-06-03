import {
  type CSSVariablesResolver,
  type MantineColorsTuple,
  createTheme,
} from "@mantine/core";

const magenta: MantineColorsTuple = [
  "#fff0f7",
  "#ffd9e9",
  "#ffb0d2",
  "#ff84ba",
  "#ff5ea5",
  "#f54498",
  "#e92a8c",
  "#d9217e",
  "#c4006d",
  "#a30058",
];

export const theme = createTheme({
  primaryColor: "magenta",
  primaryShade: { light: 8, dark: 7 },
  colors: {
    magenta,
  },
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  headings: {
    fontFamily: "Poppins, Inter, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "28px", lineHeight: "1.2" },
      h2: { fontSize: "20px", lineHeight: "1.3" },
      h3: { fontSize: "16px", lineHeight: "1.35", fontWeight: "600" },
      h4: { fontSize: "14px", lineHeight: "1.4", fontWeight: "600" },
    },
  },
  defaultRadius: "md",
  radius: {
    xs: "3px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },
  fontSizes: {
    xs: "11px",
    sm: "12px",
    md: "13.5px",
    lg: "15px",
    xl: "18px",
  },
  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "32px",
  },
  cursorType: "pointer",
  defaultGradient: {
    from: "magenta.7",
    to: "magenta.9",
    deg: 135,
  },
  components: {
    Button: {
      defaultProps: {
        size: "sm",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        padding: "lg",
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
    Tabs: {
      defaultProps: {
        variant: "default",
      },
    },
    TextInput: {
      defaultProps: {
        size: "sm",
        radius: "md",
      },
    },
    Textarea: {
      defaultProps: {
        size: "sm",
        radius: "md",
        autosize: true,
        minRows: 3,
      },
    },
    Select: {
      defaultProps: {
        size: "sm",
        radius: "md",
      },
    },
    Badge: {
      defaultProps: {
        size: "sm",
        radius: "xl",
      },
    },
  },
});

export const resolver: CSSVariablesResolver = (theme) => ({
  variables: {
    "--mantine-color-body": "var(--ch-bg-0)",
  },
  dark: {
    "--mantine-color-text": "var(--ch-fg-1)",
    "--mantine-color-dimmed": "var(--ch-fg-2)",
    "--mantine-color-default": "var(--ch-bg-1)",
    "--mantine-color-default-hover": "var(--ch-bg-hover)",
    "--mantine-color-default-color": "var(--ch-fg-1)",
    "--mantine-color-default-border": "var(--ch-border-m)",
    "--mantine-color-anchor": theme.colors.magenta[5],
  },
  light: {
    "--mantine-color-text": "var(--ch-fg-1)",
    "--mantine-color-dimmed": "var(--ch-fg-2)",
    "--mantine-color-default": "var(--ch-bg-1)",
    "--mantine-color-default-hover": "var(--ch-bg-hover)",
    "--mantine-color-default-color": "var(--ch-fg-1)",
    "--mantine-color-default-border": "var(--ch-border-m)",
    "--mantine-color-anchor": theme.colors.magenta[7],
  },
});
