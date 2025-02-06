"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  animate?: boolean
  thickness?: 'thin' | 'default' | 'thick'
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({
  className,
  value = 0,
  variant = 'default',
  showValue = false,
  animate = true,
  thickness = 'default',
  ...props
}, ref) => {
  // Ensure value is within valid range
  const clampedValue = Math.max(0, Math.min(100, value))

  // Define variant styles
  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  // Define thickness styles
  const thicknessStyles = {
    thin: 'h-1',
    default: 'h-2',
    thick: 'h-3'
  }

  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-gray-900/20",
          thicknessStyles[thickness],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1",
            variantStyles[variant],
            animate && "transition-all duration-200"
          )}
          style={{ 
            transform: `translateX(-${100 - clampedValue}%)`,
          }}
        />
      </ProgressPrimitive.Root>
      
      {showValue && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 transform px-2 text-xs font-medium">
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  )
})

Progress.displayName = "Progress"

export { Progress }
export type { ProgressProps }