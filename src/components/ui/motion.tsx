import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

// Brutalism animation variants
export const brutalVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 10,
    scale: 0.98 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.15
    }
  }
};

export const brutalHover: Variants = {
  rest: { 
    x: 0, 
    y: 0,
    boxShadow: "4px 4px 0px hsl(var(--border))"
  },
  hover: { 
    x: -2, 
    y: -2,
    boxShadow: "6px 6px 0px hsl(var(--border))",
    transition: {
      duration: 0.15,
      ease: "easeOut"
    }
  },
  tap: { 
    x: 1, 
    y: 1,
    boxShadow: "2px 2px 0px hsl(var(--border))",
    transition: {
      duration: 0.1
    }
  }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Motion Card with brutal hover effect
interface MotionCardProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={brutalHover}
        className={cn(
          "rounded-lg border-2 border-border bg-card text-card-foreground shadow-brutal transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

// Motion Button wrapper for enhanced interactions
interface MotionButtonWrapperProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionButtonWrapper = forwardRef<HTMLDivElement, MotionButtonWrapperProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={cn("inline-block", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionButtonWrapper.displayName = "MotionButtonWrapper";

// Animated container for staggered children
interface MotionContainerProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionContainer = forwardRef<HTMLDivElement, MotionContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionContainer.displayName = "MotionContainer";

// Animated item for use within MotionContainer
interface MotionItemProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionItem = forwardRef<HTMLDivElement, MotionItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={fadeInUp}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionItem.displayName = "MotionItem";

// Stat card with count-up animation effect
interface MotionStatCardProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionStatCard = forwardRef<HTMLDivElement, MotionStatCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ 
          y: -4,
          boxShadow: "6px 6px 0px hsl(var(--border))"
        }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className={cn(
          "rounded-lg border-2 border-border bg-card p-6 shadow-brutal",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionStatCard.displayName = "MotionStatCard";

// Page transition wrapper
interface MotionPageProps extends HTMLMotionProps<"div"> {
  className?: string;
  children?: React.ReactNode;
}

export const MotionPage = forwardRef<HTMLDivElement, MotionPageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionPage.displayName = "MotionPage";

// Export motion for direct use
export { motion };
