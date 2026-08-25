import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fbfbf5",
        hairline: "#e4e4e7",
        secondary: "#71717a",
        tertiary: "#a1a1aa",
        aloe: "#c1fbd4",
        pistachio: "#d4f9e0",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
