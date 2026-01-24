/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Exact web token alignment from globals.css
        background: "#f8fafc",
        foreground: "#1f2937",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1f2937",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#1f2937",
        },
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#f0fdf4",
        },
        secondary: {
          DEFAULT: "#3b82f6",
          foreground: "#eef2ff",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#f97316",
          foreground: "#7c2d12",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fef2f2",
        },
        border: "rgba(15, 23, 42, 0.12)",
        input: "rgba(15, 23, 42, 0.08)",
        ring: "rgba(22, 163, 74, 0.25)",

        // Semantic colors
        success: "#22c55e",
        warning: "#f59e0b",

        // Chart colors
        "chart-1": "#f97316",
        "chart-2": "#22c55e",
        "chart-3": "#3b82f6",
        "chart-4": "#a855f7",
        "chart-5": "#f472b6",

        // Meal type colors
        breakfast: "#f97316",
        lunch: "#22c55e",
        dinner: "#3b82f6",
        snack: "#a855f7",
      },
      borderRadius: {
        sm: "10px",
        md: "12px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "26px",
        "4xl": "30px",
      },
      fontFamily: {
        sans: ["DMSans-Regular"],
        "sans-medium": ["DMSans-Medium"],
        "sans-semibold": ["DMSans-SemiBold"],
        "sans-bold": ["DMSans-Bold"],
        display: ["InstrumentSerif-Regular"],
        "display-italic": ["InstrumentSerif-Italic"],
        mono: ["JetBrainsMono-Regular"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15, 23, 42, 0.05)",
        DEFAULT: "0 2px 4px rgba(15, 23, 42, 0.08)",
        md: "0 4px 6px rgba(15, 23, 42, 0.1)",
        lg: "0 10px 15px rgba(15, 23, 42, 0.1)",
        xl: "0 20px 25px rgba(15, 23, 42, 0.12)",
        primary: "0 4px 14px rgba(22, 163, 74, 0.2)",
      },
    },
  },
  plugins: [],
};
