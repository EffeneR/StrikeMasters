// src/components/ui/progress.tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

// Define interface before using it
interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>((props, ref) => {
  const { className, value, ...otherProps } = props
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-gray-900/20",
        className
      )}
      {...otherProps}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all duration-200"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }