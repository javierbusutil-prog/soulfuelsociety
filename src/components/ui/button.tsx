import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Slate Blue background
        default:
          "bg-primary text-primary-foreground rounded-xl hover:bg-primary/90",
        // Destructive - Muted red
        destructive:
          "bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90",
        // Secondary/Outline - Transparent with Slate Blue border
        outline:
          "border border-primary bg-transparent text-primary rounded-xl hover:bg-secondary",
        // Secondary - Warm Sand background
        secondary:
          "bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80",
        // Ghost - No background
        ghost: "hover:bg-secondary hover:text-secondary-foreground rounded-xl",
        // Link - Text only
        link: "text-primary underline-offset-4 hover:underline",
        // Accent CTA - Muted Clay (use sparingly for key actions like Upgrade, Checkout)
        accent:
          "bg-accent text-accent-foreground rounded-xl hover:bg-accent/90",
        // Success - Calm completion state
        success:
          "bg-success text-success-foreground rounded-xl hover:bg-success/90",
        // Tab variant for navigation
        tab:
          "text-muted-foreground hover:text-foreground data-[active=true]:text-primary",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
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
