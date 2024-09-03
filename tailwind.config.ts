import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/templates/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'selector',
  theme: {
    extend: {
      backgroundColor:{
        'brand': '#ff6257',
        'tomatom': '#ff625794',
      },
      backgroundImage: {
        "bgLight": "url('/greybg.png')",
        "bgDark": "url('/greybg-dark.png')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        'bar': '0 0 0.1em hsla(234, 29%, 20%, 0.993)',
      },
      colors: {
        'brand': '#ff6257',
        'tomatom': '#ff625794',
      },
      dropShadow: {
        'bar': '0 0 0.1em hsl(3.93deg 100% 67.06% / 78%)',
      },
      fill: {
        'tom': '#e2e8f0',
      },
      height: {
        'auto': 'auto',
      },
      maxHeight: {
        '77': '77dvh',
        '78': '78dvh',
      },
      margin: {
        'auto': 'auto',
      },
      padding: {
        'auto': 'auto',
      },
      stroke: {
        'tom': '#e2e8f0',
      },
      width: {
        'auto': 'auto',
      }
    },
    screens: {
      'tablets': '500px',
      'tablets1': '769px',
      'mobile': {'max': '768px'},
    }
  },
  plugins: [],
};
export default config;
