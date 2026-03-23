module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--text-main)",
        primary: "var(--primary)",
        brand: {
          DEFAULT: "#FAFF00",
          dark: "#d97706", /* amber-600 for a deep gold gradient */
        }
      },
    },
  },
  plugins: [],
};
