"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

// Trigger variants
const triggerVariants = cva(
  "flex w-full items-center justify-between rounded-md border bg-transparent text-sm ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        outline: "border-2",
        ghost: "border-none shadow-none",
        underline: "border-b border-t-0 border-x-0 rounded-none",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-10 px-3",
        lg: "h-12 px-4 text-base",
        xl: "h-14 px-5 text-lg",
      },
      state: {
        default: "",
        error: "border-destructive focus:ring-destructive",
        success: "border-green-500 focus:ring-green-500",
        warning: "border-yellow-500 focus:ring-yellow-500",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
)

interface SelectTriggerProps 
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof triggerVariants> {
  iconClassName?: string
  hideIcon?: boolean
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(({
  className,
  children,
  variant,
  size,
  state,
  iconClassName,
  hideIcon = false,
  ...props
}, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(triggerVariants({ variant, size, state }), className)}
    {...props}
  >
    {children}
    {!hideIcon && (
      <SelectPrimitive.Icon asChild>
        <ChevronDown className={cn("h-4 w-4 opacity-50", iconClassName)} />
      </SelectPrimitive.Icon>
    )}
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

// Content variants
const contentVariants = cva(
  "relative z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
  {
    variants: {
      size: {
        sm: "min-w-[6rem]",
        default: "min-w-[8rem]",
        lg: "min-w-[10rem]",
        xl: "min-w-[12rem]",
      },
      variant: {
        default: "",
        flat: "border-none shadow-none",
        elevated: "shadow-lg",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

interface SelectContentProps 
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>,
    VariantProps<typeof contentVariants> {
  position?: "item-aligned" | "popper"
  maxHeight?: number
  sideOffset?: number
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(({
  className,
  children,
  position = "popper",
  size,
  variant,
  maxHeight = 300,
  sideOffset = 4,
  ...props
}, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        contentVariants({ size, variant }),
        position === "popper" && "translate-y-1",
        className
      )}
      position={position}
      sideOffset={sideOffset}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-popover border-b">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport 
        className={cn("p-1", maxHeight && `max-h-[${maxHeight}px]`)}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-popover border-t">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

// Item variants
const itemVariants = cva(
  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base py-2",
        xl: "text-lg py-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SelectItemProps 
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>,
    VariantProps<typeof itemVariants> {
  checkmarkClassName?: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(({
  className,
  children,
  size,
  checkmarkClassName,
  ...props
}, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(itemVariants({ size }), className)}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className={cn("h-4 w-4", checkmarkClassName)} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

// Label variants
const labelVariants = cva(
  "px-2 py-1.5 text-sm font-semibold",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SelectLabelProps 
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>,
    VariantProps<typeof labelVariants> {}

const SelectLabel = React.forwardRef<HTMLLabelElement, SelectLabelProps>(({
  className,
  size,
  ...props
}, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(labelVariants({ size }), className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  type SelectTriggerProps,
  type SelectContentProps,
  type SelectItemProps,
  type SelectLabelProps,
}