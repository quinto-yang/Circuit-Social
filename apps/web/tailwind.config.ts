import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#11131a",
        mist: "#eff2ec",
        jade: "#19c37d",
        moss: "#0d8053",
        coral: "#ff6b5e",
        sky: "#d9f4ff"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 34, 28, 0.12)",
        soft: "0 12px 30px rgba(15, 34, 28, 0.08)"
      },
      borderRadius: {
        panel: "28px"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(17, 19, 26, 0.04) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
