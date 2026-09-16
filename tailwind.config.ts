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
        // Neutral ramp — exact logo ink (#1C1C1C) extended into a full scale
        neutral: {
          0: "#FFFFFF",
          50: "#F7F7F7",
          100: "#EDEDED",
          200: "#D9D9D9",
          300: "#B8B8B8",
          400: "#8F8F8F",
          500: "#737373",
          600: "#595959",
          700: "#404040",
          800: "#2E2E2E",
          900: "#1C1C1C",
        },
        // Accent — Muted Gold (brand-consistent, matches momentumlabzz.com)
        accent: {
          50: "#FBF6E9",
          100: "#F2E6C4",
          300: "#DDBE6E",
          500: "#C8A84B",
          700: "#9C7F31",
        },
        // Semantic / Status colors — desaturated, premium muted tone
        success: {
          bg: "#E9F5EC",
          text: "#2F7D4F",
        },
        warning: {
          bg: "#FBF3E4",
          text: "#B8873B",
        },
        danger: {
          bg: "#FBEAEA",
          text: "#C64545",
        },
        info: {
          bg: "#EAF1FB",
          text: "#3E6FB0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      // Corner radius — soft and consistent, never sharp on cards
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        full: "999px",
      },
      // Elevation — extremely subtle, flat + soft system
      boxShadow: {
        sm: "0 1px 2px rgba(28,28,28,0.04)",
        md: "0 4px 12px rgba(28,28,28,0.08)",
        lg: "0 12px 32px rgba(28,28,28,0.12)",
      },
      // Spacing — 4px base unit
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
      },
      // Typography scale
      fontSize: {
        display: ["32px", { lineHeight: "40px", fontWeight: "600" }],
        h1: ["24px", { lineHeight: "32px", fontWeight: "600" }],
        h2: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        h3: ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-medium": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        small: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        micro: ["11px", { lineHeight: "14px", fontWeight: "500" }],
      },
      // Motion — minimal and functional
      transitionDuration: {
        "120": "120ms",
        "150": "150ms",
        "200": "200ms",
        "220": "220ms",
      },
      transitionTimingFunction: {
        "ease-out": "ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
