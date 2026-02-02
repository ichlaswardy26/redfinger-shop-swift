import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-border",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm",
        outline:
          "bg-background shadow-brutal hover:bg-accent hover:text-accent-foreground hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm",
        secondary:
          "bg-secondary text-secondary-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm",
        ghost:
          "border-transparent hover:bg-accent hover:text-accent-foreground hover:border-border",
        link: 
          "text-primary underline-offset-4 hover:underline border-transparent",
        hero: 
          "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-brutal-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-xl active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal font-bold",
        brutal:
          "bg-accent text-accent-foreground shadow-brutal-accent hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutal-sm font-bold",
        glass:
          "bg-background/70 backdrop-blur-glass border-border/50 shadow-glass hover:bg-background/90 hover:shadow-glass-lg",
      },
      size: {
        default: "h-11 px-5 py-2 rounded-md",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-11 w-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
