import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme.js";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        11: "2.75rem", // 44px min tap target
      },
    },
  },
  plugins: [],
} satisfies Config;


