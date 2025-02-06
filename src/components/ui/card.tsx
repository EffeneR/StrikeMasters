"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  "rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border bg-card text-card-foreground shadow hover:shadow-md",
        outline: "border-2 bg-transparent hover:bg-card/5",
        ghost: "border-0 shadow-none hover:bg-card/5",
        elevated: "border-0 bg-card shadow-lg hover:shadow-xl",
        interactive: "border bg-card cursor-pointer hover:scale-[1.02] hover:shadow-lg"
      },
      size: {
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
        xl: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant,
  size,
  loading,
  disabled,
  onClick,
  children,
  ...props
}, ref) => {
  const cardClasses = cn(
    cardVariants({ variant, size }),
    loading && "animate-pulse pointer-events-none",
    disabled && "opacity-60 pointer-events-none",
    onClick && "cursor-pointer",
    className
  )

  return (
    <div
      ref={ref}
      className={cardClasses}
      onClick={!disabled && !loading ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  )
})
Card.displayName = "Card"

const headerVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      size: {
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
        xl: "p-8"
      },
      align: {
        left: "items-start",
        center: "items-center",
        right: "items-end"
      }
    },
    defaultVariants: {
      size: "md",
      align: "left"
    }
  }
)

interface CardHeaderProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof headerVariants> {
  compact?: boolean
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({
  className,
  size,
  align,
  compact,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      headerVariants({ size: compact ? 'sm' : size, align }),
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const titleVariants = cva(
  "font-semibold leading-none tracking-tight",
  {
    variants: {
      size: {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl"
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold"
      }
    },
    defaultVariants: {
      size: "md",
      weight: "semibold"
    }
  }
)

interface CardTitleProps 
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof titleVariants> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({
  className,
  size,
  weight,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn(titleVariants({ size, weight }), className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  truncate?: boolean
  lines?: number
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(({
  className,
  truncate,
  lines,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground",
      truncate && "truncate",
      lines && `line-clamp-${lines}`,
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const contentVariants = cva(
  "",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "px-2 pt-0",
        md: "px-4 pt-0",
        lg: "px-6 pt-0",
        xl: "px-8 pt-0"
      },
      spacing: {
        none: "space-y-0",
        sm: "space-y-2",
        md: "space-y-4",
        lg: "space-y-6"
      }
    },
    defaultVariants: {
      padding: "md",
      spacing: "md"
    }
  }
)

interface CardContentProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof contentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({
  className,
  padding,
  spacing,
  ...props
}, ref) => (
  <div 
    ref={ref} 
    className={cn(contentVariants({ padding, spacing }), className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const footerVariants = cva(
  "flex items-center pt-0",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "px-2",
        md: "px-4",
        lg: "px-6",
        xl: "px-8"
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly"
      }
    },
    defaultVariants: {
      padding: "md",
      justify: "start"
    }
  }
)

interface CardFooterProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof footerVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({
  className,
  padding,
  justify,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(footerVariants({ padding, justify }), className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps,
}