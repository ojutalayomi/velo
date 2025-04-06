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
  		backgroundColor: {
  			brand: '#ff6257',
  			tomatom: '#ff625794'
  		},
  		backgroundImage: {
  			'bgLight': "url('/greybg.jpg')",
  			'bgDark': "url('/greybg-dark.png')",
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		boxShadow: {
  			bar: '0 0 0.1em hsla(234, 29%, 20%, 0.993)',
  			'bar-dark': '0 0 0.1em hsl(0deg 0% 100%)'
  		},
  		colors: {
  			brand: '#ff6257',
  			tomatom: '#ff625794',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		dropShadow: {
  			bar: '0 0 0.1em hsl(3.93deg 100% 67.06% / 78%)',
  			'bar-dark': '0 0 0.1em hsl(0deg 0% 100%)'
  		},
  		fill: {
  			tom: '#e2e8f0'
  		},
  		height: {
  			auto: 'auto'
  		},
  		maxHeight: {
  			'77': '77dvh',
  			'78': '78dvh'
  		},
  		margin: {
  			auto: 'auto'
  		},
  		padding: {
  			auto: 'auto'
  		},
  		stroke: {
  			tom: '#e2e8f0'
  		},
  		width: {
  			auto: 'auto'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	},
  	screens: {
		'900px': '900px',
  		tablets: '500px',
		sm: '640px',
		md: '768px',
  		tablets1: '769px',
  		mb: {
  			max: '639px'
  		},
  		mobile: {
  			max: '768px'
  		},
  		lg: '1024px',
  		large: '1265px'
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
