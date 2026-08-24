import type { Config } from "tailwindcss";

// Tokens del design system de Guantearqueros Bolivia.
// Los nombres coinciden 1:1 con "Design System.dc.html".
export default {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0A0A", // fondo global
          900: "#0D0D0C", // superficie de sección / drawer
          850: "#131312", // card, input
          800: "#1C1C1B", // divisores, barras
          700: "#232322",
        },
        line: { DEFAULT: "#262625", strong: "#2B2B29", soft: "#1E1E1D" },
        brand: {
          DEFAULT: "#FA2A00",
          hot: "#FF5A2B",
          deep: "#C81F00",
          soft: "#3A2A22",
        },
        alert: { DEFAULT: "#E10600", soft: "#FF6E68" },
        drei: { DEFAULT: "#1B3A5C", line: "#4E8FCB", ink: "#BFD8EE" },
        content: { DEFAULT: "#F5F3F0", muted: "#A8A5A0", dim: "#6E6B67", faint: "#57554F" },
        state: { ok: "#6FCF8E", warn: "#E2B93B" },
      },
      fontFamily: {
        display: ["var(--font-anton)", "Anton", "sans-serif"],
        sans: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["6.75rem", { lineHeight: "0.86", letterSpacing: "-0.01em" }],
        "display-lg": ["3.5rem", { lineHeight: "0.92" }],
        "display-md": ["2.125rem", { lineHeight: "1" }],
        label: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.16em" }],
      },
      borderRadius: { none: "0px", sm: "2px" },
      boxShadow: {
        "glow-brand": "0 12px 40px rgba(250,42,0,0.35)",
        "glow-alert": "0 12px 40px rgba(225,6,0,0.30)",
        card: "0 16px 50px rgba(0,0,0,0.60)",
        focus: "0 0 0 3px rgba(250,42,0,0.15)",
      },
      backgroundImage: {
        "stripe-danger":
          "repeating-linear-gradient(115deg, #FA2A00 0 26px, #0A0A0A 26px 52px)",
        "warm-fade":
          "radial-gradient(120% 80% at 50% -10%, #17120F 0%, #0A0A0A 55%)",
        "grid-map":
          "linear-gradient(#181C1A 1px, transparent 1px), linear-gradient(90deg, #181C1A 1px, transparent 1px)",
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        rise: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        slideIn: { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        // Añadidos sobre el bundle: el prototipo los usa como gq-pulse / gq-spin.
        pulseHard: { "0%, 100%": { opacity: "1" }, "50%": { opacity: ".35" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        growY: { from: { transform: "scaleY(0.02)" }, to: { transform: "none" } },
      },
      animation: {
        marquee: "marquee 26s linear infinite",
        rise: "rise .35s ease both",
        "slide-in": "slideIn .22s ease both",
        "pulse-hard": "pulseHard 1.1s ease-in-out infinite",
        "fade-in": "fadeIn .2s ease both",
        "grow-y": "growY .5s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;

/* Utilidades de recorte — agregar en globals.css:

.clip-slash  { clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%); }
.clip-shield { clip-path: polygon(0 0, 100% 0, 100% 76%, 50% 100%, 0 76%); }
.skew-fast   { transform: skewX(-7deg); }
*/
