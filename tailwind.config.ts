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
        "shimmer": {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
        "pulse-ring": {
          "0%": {
            transform: "scale(0.8)",
            opacity: "0.8",
          },
          "50%": {
            transform: "scale(1)",
            opacity: "0.4",
          },
          "100%": {
            transform: "scale(1.2)",
            opacity: "0",
          },
        },
        "gradient-shift": {
          "0%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
          "100%": {
            backgroundPosition: "0% 50%",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-6px)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 5px hsl(var(--primary) / 0.5)",
          },
          "50%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.4)",
          },
        },
        "bounce-in": {
          "0%": {
            transform: "scale(0) translateY(-10px)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.1) translateY(0)",
          },
          "100%": {
            transform: "scale(1) translateY(0)",
            opacity: "1",
          },
        },
        "slide-up-fade": {
          "0%": {
            transform: "translateY(10px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
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
        "shimmer": "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "slide-up-fade": "slide-up-fade 0.3s ease-out",
      },
      backdropBlur: {
        glass: "12px",
        "glass-lg": "20px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
