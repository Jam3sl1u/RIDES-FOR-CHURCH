import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF8F4",
        parchment: "#F3EFE7",
        navy: { DEFAULT: "#16243D", light: "#24385C", muted: "#5B6B85" },
        gold: "#C8A24B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
