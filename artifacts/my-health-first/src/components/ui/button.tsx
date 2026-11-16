import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-sky-600 text-primary-foreground shadow-[0_2px_12px_rgba(14,165,233,0.35)] border border-white/25 hover:brightness-105 active:brightness-95",
        destructive:
          "bg-gradient-to-b from-destructive to-red-600 text-destructive-foreground shadow-[0_2px_10px_rgba(239,68,68,0.3)] border border-white/20 hover:brightness-105",
        outline:
          "border border-white/70 dark:border-white/15 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md shadow-xs hover:bg-white/90 dark:hover:bg-slate-800/70 text-foreground hover:shadow-sm",
        secondary:
          "bg-secondary/70 backdrop-blur-md text-secondary-foreground border border-white/50 dark:border-white/10 hover:bg-secondary/90 shadow-xs",
        ghost: "hover:bg-black/5 dark:hover:bg-white/10 text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-lg px-3 text-xs",
        lg: "min-h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
