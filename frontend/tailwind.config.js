/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:    "#FF6B35",   // 橙红（食欲色）
        "primary-dark": "#E55A2B",
        secondary:  "#FFD93D",   // 暖黄
        accent:     "#6BCB77",   // 绿色（健康）
        "accent-dark": "#4CAF50",
        background:  "#FFF8F0",   // 暖白
        surface:    "#FFFFFF",
        "text-primary": "#2D2D2D",
        "text-secondary": "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      borderRadius: {
        xl:  "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        card: "0 4px 24px rgba(255,107,53,0.10)",
        "card-hover": "0 8px 32px rgba(255,107,53,0.18)",
      },
    },
  },
  plugins: [],
}
