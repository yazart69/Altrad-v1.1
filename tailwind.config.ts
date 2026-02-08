import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flat: {
          sidebar: "#34495e",
          bg: "#f0f3f4",
          salmon: "#ff8a75",
          mint: "#2ecc71",
          yellow: "#f1c40f",
          blue: "#3498db",
          lightYellow: "#fdebd0",
          lightMint: "#e8f8f5"
        }
      }
    },
  },
  plugins: [],
};
export default config;