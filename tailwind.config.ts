import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#181d26",
          active: "#0d1218",
        },
        ink: "#181d26",
        body: "#333840",
        muted: "#41454d",
        hairline: "#dddddd",
        border: {
          strong: "#9297a0",
        },
        canvas: "#ffffff",
        surface: {
          soft: "#f8fafc",
          strong: "#e0e2e6",
          dark: "#181d26",
          "dark-elevated": "#1d1f25",
        },
        signature: {
          coral: "#aa2d00",
          forest: "#0a2e0e",
          cream: "#f5e9d4",
          peach: "#fcab79",
          mint: "#a8d8c4",
          yellow: "#f4d35e",
          mustard: "#d9a441",
        },
        on: {
          primary: "#ffffff",
          dark: "#ffffff",
        },
        link: {
          DEFAULT: "#1b61c9",
          active: "#1a3866",
        },
        info: {
          DEFAULT: "#254fad",
          border: "#458fff",
        },
        success: {
          DEFAULT: "#006400",
          border: "#39bf45",
        },
        pricing: {
          ink: "#1d1f25",
        }
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "96px",
      },
      borderRadius: {
        xs: "2px",
        sm: "6px",
        md: "10px",
        lg: "12px",
        pill: "9999px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
export default config;
