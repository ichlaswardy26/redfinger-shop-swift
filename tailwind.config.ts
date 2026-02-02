import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      borderWidth: {
        brutal: "2px",
        "brutal-thick": "3px",
      },
      boxShadow: {
        brutal: "4px 4px 0px hsl(var(--border))",
        "brutal-sm": "2px 2px 0px hsl(var(--border))",
        "brutal-lg": "6px 6px 0px hsl(var(--border))",
        "brutal-xl": "8px 8px 0px hsl(var(--border))",
        "brutal-primary": "4px 4px 0px hsl(var(--primary))",
        "brutal-accent": "4px 4px 0px hsl(var(--accent))",
        "brutal-hover": "6px 6px 0px hsl(var(--border))",
        "brutal-active": "2px 2px 0px hsl(var(--border))",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
        "glass-lg": "0 12px 48px 0 rgba(0, 0, 0, 0.15)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "brutal-bounce": {
          "0%, 100%": {
            transform: "translate(0, 0)",
          },
          "50%": {
            transform: "translate(-2px, -2px)",
          },
        },
        "brutal-shake": {
          "0%, 100%": {
            transform: "translateX(0)",
          },
          "25%": {
            transform: "translateX(-4px)",
          },
          "75%": {
            transform: "translateX(4px)",
          },
        },
        "brutal-press": {
          "0%": {
            transform: "translate(0, 0)",
            boxShadow: "4px 4px 0px hsl(var(--border))",
          },
          "100%": {
            transform: "translate(2px, 2px)",
            boxShadow: "2px 2px 0px hsl(var(--border))",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "brutal-bounce": "brutal-bounce 0.5s ease-in-out",
        "brutal-shake": "brutal-shake 0.3s ease-in-out",
        "brutal-press": "brutal-press 0.1s ease-out forwards",
      },
      backdropBlur: {
        glass: "12px",
        "glass-lg": "20px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
