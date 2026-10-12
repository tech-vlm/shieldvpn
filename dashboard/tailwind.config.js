/** @type {import('tailwindcss').Config} */
function rgbVar(name) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shield: {
          50: rgbVar("--s50"), 100: rgbVar("--s100"), 200: rgbVar("--s200"),
          300: rgbVar("--s300"), 400: rgbVar("--s400"), 500: rgbVar("--s500"),
          600: rgbVar("--s600"), 700: rgbVar("--s700"), 800: rgbVar("--s800"),
          900: rgbVar("--s900"), 950: rgbVar("--s950"),
        },
        accent: {
          DEFAULT: rgbVar("--accent"),
          soft: rgbVar("--accent-soft"),
        },
      },
    },
  },
  plugins: [],
};
