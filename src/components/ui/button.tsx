"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-green-500 text-white hover:bg-green-600",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600",
        info: "bg-blue-500 text-white hover:bg-blue-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        xl: "h-12 rounded-lg px-10 text-lg",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-11 w-11",
      },
      rounded: {
        default: "rounded-md",
        none: "rounded-none",
        sm: "rounded-sm",
        lg: "rounded-lg",
        full: "rounded-full",
      },
      animation: {
        none: "",
        bounce: "active:transform active:scale-95 transition-transform",
        glow: "hover:shadow-lg hover:shadow-primary/50 transition-shadow",
        pulse: "hover:animate-pulse",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
      animation: "bounce",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loadingText?: string
  iconOnly?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  rounded,
  animation,
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  loadingText,
  iconOnly = false,
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {!iconOnly && (loadingText || children)}
        </div>
      )
    }

    if (iconOnly) {
      return leftIcon || rightIcon || children
    }

    return (
      <div className="flex items-center justify-center gap-2">
        {leftIcon && <span className={cn("flex", size === "sm" ? "h-4 w-4" : "h-5 w-5")}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={cn("flex", size === "sm" ? "h-4 w-4" : "h-5 w-5")}>{rightIcon}</span>}
      </div>
    )
  }

  return (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size, rounded, animation }),
        fullWidth && "w-full",
        isLoading && "opacity-70 cursor-wait",
        iconOnly && "p-0",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </button>
  )
})

Button.displayName = "Button"

// Create a ButtonGroup component for related buttons
const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
    spacing?: "none" | "sm" | "md" | "lg"
  }
>(({ className, orientation = "horizontal", spacing = "none", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex",
      orientation === "vertical" && "flex-col",
      spacing === "none" && "gap-0",
      spacing === "sm" && "gap-2",
      spacing === "md" && "gap-4",
      spacing === "lg" && "gap-6",
      className
    )}
    {...props}
  />
))

ButtonGroup.displayName = "ButtonGroup"

export { Button, ButtonGroup, buttonVariants }
export type { ButtonProps }